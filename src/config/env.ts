import dotenv from 'dotenv';

dotenv.config();

/**
 * Application configuration.
 */
export const config = {
  /**
   * The port the application will listen on.
   * @type {string | number}
   */
  port: process.env.PORT || 3000,
  /**
   * The application's environment.
   * @type {string}
   */
  nodeEnv: process.env.NODE_ENV || 'development',
};
