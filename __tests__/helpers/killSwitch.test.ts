import fs from 'fs';
import {
  setKillSwitch,
  clearKillSwitch,
  isKillSwitchActive,
} from '../../src/helpers/killSwitch';
import { logger } from '../../src/helpers/logger';

jest.mock('fs');
jest.mock('../../src/helpers/logger');

describe('killSwitch helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setKillSwitch', () => {
    it('should create the .killswitch file successfully', () => {
      setKillSwitch();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.killswitch'),
        expect.any(String),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Kill switch engaged'),
      );
    });

    it('should handle errors when creating the file', () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write error');
      });
      setKillSwitch();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to set kill switch:',
        expect.any(Error),
      );
    });
  });

  describe('clearKillSwitch', () => {
    it('should remove the .killswitch file if it exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      clearKillSwitch();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Kill switch cleared'),
      );
    });

    it('should do nothing if the .killswitch file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      clearKillSwitch();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle errors when removing the file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Unlink error');
      });
      clearKillSwitch();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to clear kill switch:',
        expect.any(Error),
      );
    });
  });

  describe('isKillSwitchActive', () => {
    it('should return true if file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      expect(isKillSwitchActive()).toBe(true);
    });

    it('should return false if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(isKillSwitchActive()).toBe(false);
    });
  });
});
