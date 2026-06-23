import { SmartAPI } from 'smartapi-javascript';
import totp from 'totp-generator';
import { Credentails, ISmartApiData } from '../app.interface';
import { ALGO } from './constants';
import { logger } from './logger';

/**
 * Generates a SmartAPI session using the provided credentials.
 * Handles TOTP generation and dynamic IP resolution.
 * @param {Credentails} creds - User credentials.
 * @returns {Promise<ISmartApiData>}
 */
export const loginToSmartApi = async (
  creds: Credentails,
): Promise<ISmartApiData> => {
  try {
    // ... (rest of the function)
    // Otherwise, assume it's a secret and generate the TOTP.
    let totpCode = creds.CLIENT_TOTP_PIN;
    if (totpCode && totpCode.length > 6) {
      totpCode = totp(totpCode);
    }

    logger.log(
      `${ALGO}: Logging in with Client Code: ${creds.CLIENT_CODE}, TOTP: ${totpCode}`,
    );

    const smart_api = new SmartAPI({
      api_key: creds.APIKEY,
      totp: totpCode,
    });

    const sessionData = await smart_api.generateSession(
      creds.CLIENT_CODE,
      creds.CLIENT_PIN,
      totpCode,
    );

    if (!sessionData || sessionData.status !== true) {
      throw new Error(sessionData?.message || 'Failed to generate session');
    }

    return {
      jwtToken: sessionData.data.jwtToken,
      refreshToken: sessionData.data.refreshToken,
      feedToken: sessionData.data.feedToken,
    };
  } catch (error) {
    logger.error(`${ALGO}: SmartAPI Login Failed:`, error);
    throw error;
  }
};
