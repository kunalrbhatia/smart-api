import { notify } from '../../src/helpers/notifier';
import { sendTelegramMessage } from '../../src/helpers/telegram';
import { sendSlackMessage } from '../../src/helpers/slack';
import { config } from '../../src/config/env';

jest.mock('../../src/helpers/telegram', () => ({
  sendTelegramMessage: jest.fn().mockResolvedValue({ status: true }),
}));

jest.mock('../../src/helpers/slack', () => ({
  sendSlackMessage: jest.fn().mockResolvedValue({ status: true }),
}));

jest.mock('../../src/config/env', () => ({
  config: {
    useTelegram: true,
    useSlack: false,
  },
}));

describe('Notifier helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should format message and call sendTelegramMessage when Telegram is enabled', async () => {
    (config as any).useTelegram = true;
    (config as any).useSlack = true; // Even if Slack is true, Telegram takes priority

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await notify('Test message');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
    );
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
    );
    expect(sendSlackMessage).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should format message and call sendSlackMessage when Telegram is disabled and Slack is enabled', async () => {
    (config as any).useTelegram = false;
    (config as any).useSlack = true;

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await notify('Test message');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
    );
    expect(sendSlackMessage).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
    );
    expect(sendTelegramMessage).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should only log to console when both channels are disabled', async () => {
    (config as any).useTelegram = false;
    (config as any).useSlack = false;

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await notify('Test message');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
    );
    expect(sendTelegramMessage).not.toHaveBeenCalled();
    expect(sendSlackMessage).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
