import publicIp from 'public-ip';
import os from 'os';

/**
 * Gets the public IPv4 address.
 * @returns {Promise<string>}
 */
export const getPublicIp = async (): Promise<string> => {
  try {
    return await publicIp.v4();
  } catch (error) {
    console.warn('Failed to get public IP, using fallback:', error);
    return '106.213.81.181'; // A sample fallback or keep as string
  }
};

/**
 * Gets the local IP address.
 * @returns {string}
 */
export const getLocalIp = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
};

/**
 * Gets the MAC address.
 * @returns {string}
 */
export const getMacAddress = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
        return iface.mac;
      }
    }
  }
  return '00:00:00:00:00:00';
};
