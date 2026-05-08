import { notify } from '../../src/helpers/notifier';
import { sendTelegramMessage } from '../../src/helpers/telegram';

jest.mock('../../src/helpers/telegram', () => ({
  sendTelegramMessage: jest.fn().mockResolvedValue({ status: true }),
}));

describe('Notifier helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should format message and call sendTelegramMessage', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await notify('Test message');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
    );
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
    );
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining('Notification'),
    );

    consoleSpy.mockRestore();
  });
});
