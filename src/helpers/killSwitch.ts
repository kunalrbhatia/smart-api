import fs from 'fs';
import path from 'path';

const KILL_SWITCH_FILE = path.join(process.cwd(), '.killswitch');

export const setKillSwitch = (): void => {
  try {
    fs.writeFileSync(KILL_SWITCH_FILE, new Date().toISOString());
    console.log('🛑 Kill switch engaged: .killswitch file created.');
  } catch (error) {
    console.error('Failed to set kill switch:', error);
  }
};

export const clearKillSwitch = (): void => {
  try {
    if (fs.existsSync(KILL_SWITCH_FILE)) {
      fs.unlinkSync(KILL_SWITCH_FILE);
      console.log('✅ Kill switch cleared: .killswitch file removed.');
    }
  } catch (error) {
    console.error('Failed to clear kill switch:', error);
  }
};

export const isKillSwitchActive = (): boolean => {
  return fs.existsSync(KILL_SWITCH_FILE);
};
