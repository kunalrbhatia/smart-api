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

jest.mock('../../src/helpers/api');
jest.mock('../../src/config/env', () => ({
  config: {
    telegramBotToken: 'test_token',
    telegramChatId: 'test_chat_id',
    port: 8080,
  },
}));
jest.mock('../../src/helpers/killSwitch');
jest.mock('../../src/helpers/logger');
jest.mock('../../src/helpers/paperTrade');

describe('telegram helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
