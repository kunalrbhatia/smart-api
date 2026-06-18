import { sendSlackMessage } from '../../src/helpers/slack';
import { post } from '../../src/helpers/api';
import { config } from '../../src/config/env';
import { logger } from '../../src/helpers/logger';

jest.mock('../../src/helpers/api');
jest.mock('../../src/config/env', () => ({
  config: {
    slackWebhookUrl: 'https://hooks.slack.com/services/test',
  },
}));
jest.mock('../../src/helpers/logger');

describe('slack helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSlackMessage', () => {
    it('should send a message successfully', async () => {
      (post as jest.Mock).mockResolvedValue({ ok: true });
      await sendSlackMessage('test message');
      expect(post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        { text: 'test message' },
        { 'Content-Type': 'application/json' },
      );
    });

    it('should warn if config is missing', async () => {
      const originalUrl = config.slackWebhookUrl;
      (config as any).slackWebhookUrl = undefined;
      await sendSlackMessage('test');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('disabled'),
      );
      (config as any).slackWebhookUrl = originalUrl;
    });

    it('should handle exceptions', async () => {
      (post as jest.Mock).mockRejectedValue(new Error('Network error'));
      await sendSlackMessage('test');
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
      );
    });
  });
});
