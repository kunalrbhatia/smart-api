import { config } from '../config/env';
import { post } from './api';
import { logger } from './logger';

/**
 * Sends a message to Slack via Incoming Webhook.
 * @param {string} message - The message to send.
 * @returns {Promise<void>}
 */
export const sendSlackMessage = async (message: string): Promise<void> => {
  const { slackWebhookUrl } = config;

  if (!slackWebhookUrl) {
    logger.warn(
      'Slack notifications are disabled: SLACK_WEBHOOK_URL is missing.',
    );
    return;
  }

  try {
    await post(
      slackWebhookUrl,
      { text: message },
      { 'Content-Type': 'application/json' },
    );
  } catch (error) {
    logger.error('Error sending Slack message:', error);
  }
};
