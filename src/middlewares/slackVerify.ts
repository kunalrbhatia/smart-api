import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';
import { logger } from '../helpers/logger';

/**
 * Middleware to verify that requests are coming from Slack.
 */
export const verifySlackSignature = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { slackSigningSecret } = config;

  if (!slackSigningSecret) {
    logger.warn(
      'SLACK_SIGNING_SECRET is missing. Skipping Slack verification.',
    );
    return next();
  }

  const signature = req.headers['x-slack-signature'] as string;
  const timestamp = req.headers['x-slack-request-timestamp'] as string;

  if (!signature || !timestamp) {
    return res.status(401).send('Unauthorized');
  }

  // Prevent replay attacks
  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - Number.parseInt(timestamp)) > 300) {
    return res.status(401).send('Unauthorized');
  }

  // Use the raw body captured by bodyParser if available
  const rawBody = (req as any).rawBody || '';
  const sigBasestring = `v0:${timestamp}:${rawBody}`;

  const hmac = crypto
    .createHmac('sha256', slackSigningSecret)
    .update(sigBasestring)
    .digest('hex');

  const mySignature = `v0=${hmac}`;

  if (
    crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8'),
    )
  ) {
    next();
  } else {
    logger.error('Slack signature verification failed.');
    return res.status(401).send('Unauthorized');
  }
};
