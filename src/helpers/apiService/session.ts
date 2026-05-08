import { getPublicIp, getLocalIp, getMacAddress } from '../ip';
import { loginToSmartApi } from '../smartApiLogin';
import SmartSession from '../../store/smartSession';
import DataStore from '../../store/dataStore';
import { ISmartApiData } from '../../app.interface';

/**
 * Gets the smart API session data.
 * @returns {Promise<ISmartApiData>}
 */
export const getSmartSession = async (): Promise<ISmartApiData> => {
  const session = SmartSession.getInstance().getPostData();
  if (session && session.jwtToken) {
    return session;
  }
  const creds = DataStore.getInstance().getPostData();
  const newSession = await loginToSmartApi(creds);
  SmartSession.getInstance().setPostData(newSession);
  return newSession;
};

/**
 * Generates the headers for SmartAPI requests.
 */
export const getAuthHeaders = async () => {
  const smartApiData = await getSmartSession();
  const cred = DataStore.getInstance().getPostData();
  const publicIp = await getPublicIp();
  const localIp = getLocalIp();
  const macAddress = getMacAddress();

  return {
    Authorization: `Bearer ${smartApiData.jwtToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': localIp,
    'X-ClientPublicIP': publicIp,
    'X-MACAddress': macAddress,
    'X-PrivateKey': cred.APIKEY,
  };
};
