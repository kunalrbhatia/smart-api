import {
  sendTelegramMessage,
  startTelegramBotListener,
} from '../../src/helpers/telegram';
import { get } from '../../src/helpers/api';
import { config } from '../../src/config/env';
import {
  setKillSwitch,
  clearKillSwitch,
  isKillSwitchActive,
} from '../../src/helpers/killSwitch';
import { logger } from '../../src/helpers/logger';
import { setPaperMode } from '../../src/helpers/paperTrade';
import { exec } from 'child_process';
import fs from 'fs';

jest.mock('../../src/helpers/api');
jest.mock('../../src/config/env', () => ({
  config: {
    telegramBotToken: 'test_token',
    telegramChatId: 'test_chat_id',
    port: 8080,
    useTelegram: true,
  },
}));
jest.mock('../../src/helpers/killSwitch');
jest.mock('../../src/helpers/logger');
jest.mock('../../src/helpers/paperTrade');
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('telegram helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set a date after the regional outage (June 23, 2026) to enable tests
    jest.useFakeTimers({ now: new Date('2026-06-25T10:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isTelegramPaused', () => {
    it('should return true if the current date is before June 23, 2026', async () => {
      // Set a date during the outage
      jest.useFakeTimers({ now: new Date('2026-06-16T10:00:00Z') });
      await sendTelegramMessage('test');
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('suppressed as services are paused'),
      );
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe('sendTelegramMessage', () => {
    it('should send a message successfully', async () => {
      (get as jest.Mock).mockResolvedValue({ ok: true });
      await sendTelegramMessage('test message');
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining('sendMessage'),
        {},
      );
    });

    it('should warn if config is missing', async () => {
      const originalToken = config.telegramBotToken;
      (config as any).telegramBotToken = undefined;
      await sendTelegramMessage('test');
      expect(logger.warn).toHaveBeenCalled();
      (config as any).telegramBotToken = originalToken;
    });

    it('should log error if API returns ok: false', async () => {
      (get as jest.Mock).mockResolvedValue({
        ok: false,
        description: 'Error msg',
      });
      await sendTelegramMessage('test');
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        'Error msg',
      );
    });

    it('should handle exceptions', async () => {
      (get as jest.Mock).mockRejectedValue(new Error('Network error'));
      await sendTelegramMessage('test');
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
      );
    });
  });

  describe('startTelegramBotListener', () => {
    it('should warn if config is missing', async () => {
      const originalToken = config.telegramBotToken;
      (config as any).telegramBotToken = '';
      await startTelegramBotListener();
      expect(logger.warn).toHaveBeenCalled();
      (config as any).telegramBotToken = originalToken;
    });

    it('should initialize and poll for updates', async () => {
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [{ update_id: 100 }] }) // init
        .mockResolvedValueOnce({ ok: true, result: [] }); // first poll

      await startTelegramBotListener();
      await Promise.resolve(); // Allow init to finish
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting from update ID 101'),
      );

      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // Allow poll to run
      expect(get).toHaveBeenCalledTimes(3);
    });

    it('should handle initialization error', async () => {
      (get as jest.Mock).mockRejectedValueOnce(new Error('Init error'));
      await startTelegramBotListener();
      await Promise.resolve();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('initializing'),
        expect.any(Error),
      );
    });

    it('should process /kill command', async () => {
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] }) // init
        .mockResolvedValueOnce({
          // poll
          ok: true,
          result: [
            {
              update_id: 101,
              message: { chat: { id: 'test_chat_id' }, text: '/kill' },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }) // sendMessage
        .mockResolvedValueOnce({ ok: true }) // confirm
        .mockResolvedValueOnce({ ok: true }); // local kill route

      await startTelegramBotListener();
      await Promise.resolve(); // init

      // The first poll is called immediately
      await Promise.resolve(); // poll
      await Promise.resolve(); // sendMessage
      await Promise.resolve(); // confirm
      await Promise.resolve(); // local kill

      expect(setKillSwitch).toHaveBeenCalled();
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining('localhost:8080/kill'),
        {},
      );
    });

    it('should reject commands from unauthorized chats', async () => {
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] }) // init
        .mockResolvedValueOnce({
          // poll
          ok: true,
          result: [
            {
              update_id: 101,
              message: { chat: { id: 'wrong_chat_id' }, text: '/kill' },
            },
          ],
        });

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized'),
      );
      expect(setKillSwitch).not.toHaveBeenCalled();
    });

    it('should process /resume command', async () => {
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] })
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: { chat: { id: 'test_chat_id' }, text: '/resume' },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }); // sendMessage

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll
      await Promise.resolve(); // sendMessage

      expect(clearKillSwitch).toHaveBeenCalled();
    });

    it('should process /status command when active', async () => {
      (isKillSwitchActive as jest.Mock).mockReturnValue(true);
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] })
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: {
                chat: { id: 'test_chat_id' },
                text: '/status',
              },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }); // sendMessage

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll
      await Promise.resolve(); // sendMessage

      expect(get).toHaveBeenCalledWith(expect.stringContaining('Stopped'), {});
    });

    it('should process /status command when running', async () => {
      (isKillSwitchActive as jest.Mock).mockReturnValue(false);
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] })
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: {
                chat: { id: 'test_chat_id' },
                text: '/status',
              },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }); // sendMessage

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll
      await Promise.resolve(); // sendMessage

      expect(get).toHaveBeenCalledWith(expect.stringContaining('Running'), {});
    });

    it('should process /paperon command', async () => {
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] })
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: {
                chat: { id: 'test_chat_id' },
                text: '/paperon',
              },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }); // sendMessage

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll
      await Promise.resolve(); // sendMessage

      expect(setPaperMode).toHaveBeenCalledWith(true);
    });

    it('should process /paperoff command', async () => {
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] })
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: {
                chat: { id: 'test_chat_id' },
                text: '/paperoff',
              },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }); // sendMessage

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll
      await Promise.resolve(); // sendMessage

      expect(setPaperMode).toHaveBeenCalledWith(false);
    });

    it('should process /logs command (PM2 success)', async () => {
      const pm2Logs = 'PM2 log output';
      (exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, { stdout: pm2Logs });
      });

      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] }) // init
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: { chat: { id: 'test_chat_id' }, text: '/logs' },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }); // sendMessage

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll
      await Promise.resolve(); // fetchLogs
      await Promise.resolve(); // sendMessage

      expect(get).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent('```\n' + pm2Logs + '\n```'),
        ),
        {},
      );
    });

    it('should process /logs command (PM2 fail, fallback to file)', async () => {
      (exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
        callback(new Error('PM2 not found'), { stdout: '' });
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        'file log output line 1\nline 2',
      );

      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] }) // init
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: { chat: { id: 'test_chat_id' }, text: '/logs' },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }); // sendMessage

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll
      await Promise.resolve(); // fetchLogs
      await Promise.resolve(); // sendMessage

      expect(get).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent('```\nfile log output line 1\nline 2\n```'),
        ),
        {},
      );
    });

    it('should truncate logs if they are too long', async () => {
      const longLogs = 'A'.repeat(5000);
      (exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, { stdout: longLogs });
      });

      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] })
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: { chat: { id: 'test_chat_id' }, text: '/logs' },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true });

      await startTelegramBotListener();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const callWithSendMessage = (get as jest.Mock).mock.calls.find(call =>
        call[0].includes('sendMessage'),
      );
      const url = decodeURIComponent(callWithSendMessage[0]);
      expect(url).toContain('...');
      expect(url.length).toBeLessThan(4200);
    });

    it('should return "No logs found." if output is empty', async () => {
      (exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, { stdout: '' });
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] })
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: { chat: { id: 'test_chat_id' }, text: '/logs' },
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true });

      await startTelegramBotListener();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(get).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('No logs found.')),
        {},
      );
    });

    it('should handle poll error gracefully', async () => {
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] }) // init
        .mockRejectedValueOnce(new Error('Poll error')); // poll

      await startTelegramBotListener();
      await Promise.resolve(); // init
      await Promise.resolve(); // poll (fail)

      expect(get).toHaveBeenCalledTimes(2);

      // Should schedule next poll despite error
      jest.advanceTimersByTime(5000);
      (get as jest.Mock).mockResolvedValueOnce({ ok: true, result: [] }); // next poll
      await Promise.resolve();

      expect(get).toHaveBeenCalledTimes(3);
    });

    it('should skip messages without text', async () => {
      (get as jest.Mock)
        .mockResolvedValueOnce({ ok: true, result: [] })
        .mockResolvedValueOnce({
          ok: true,
          result: [
            {
              update_id: 101,
              message: { chat: { id: 'test_chat_id' } }, // no text
            },
          ],
        });

      await startTelegramBotListener();
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      // Nothing should happen
    });
  });
});
