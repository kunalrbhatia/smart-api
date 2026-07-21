import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { ScripMasterStoreDataType } from '../app.interface';
import { SCRIP_MASTER_FILE } from '../helpers/constants';

/**
 * A singleton class to store and manage scrip master data.
 */
class ScripMasterStore {
  /**
   * The singleton instance of the ScripMasterStore class.
   * @private
   * @static
   * @type {ScripMasterStore}
   */
  private static instance: ScripMasterStore;
  /**
   * The scrip master data.
   * @private
   * @type {ScripMasterStoreDataType}
   */
  private postData: ScripMasterStoreDataType;
  /**
   * The timestamp when the data was last set in memory.
   * @private
   * @type {number}
   */
  private lastSetTimestamp: number;
  /**
   * The private constructor to create a new instance of the ScripMasterStore.
   * @private
   */
  private constructor() {
    // Initialize postData with default values or leave it empty.
    this.postData = {
      SCRIP_MASTER_JSON: [],
    };
    this.lastSetTimestamp = 0;
  }
  /**
   * Gets the singleton instance of the ScripMasterStore.
   * @static
   * @returns {ScripMasterStore} The singleton instance.
   */
  static getInstance() {
    if (!ScripMasterStore.instance) {
      ScripMasterStore.instance = new ScripMasterStore();
    }
    return ScripMasterStore.instance;
  }
  /**
   * Sets the scrip master data.
   * @param {ScripMasterStoreDataType} data - The scrip master data to set.
   */
  setPostData(data: ScripMasterStoreDataType) {
    this.postData = data;
    this.lastSetTimestamp = Date.now();
  }
  /**
   * Gets the scrip master data.
   * @returns {ScripMasterStoreDataType} The scrip master data.
   */
  getPostData() {
    return this.postData;
  }
  /**
   * Checks if the stored data is expired.
   * Returns true if the file does not exist or its modified date is not today (in IST).
   * @returns {boolean} True if expired, false otherwise.
   */
  isExpired() {
    const filePath = path.join(process.cwd(), SCRIP_MASTER_FILE);
    if (!fs.existsSync(filePath)) return true;

    const stats = fs.statSync(filePath);
    const fileDateStr = moment(stats.mtime)
      .tz('Asia/Kolkata')
      .format('YYYY-MM-DD');
    const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

    return fileDateStr !== todayStr;
  }
}

export default ScripMasterStore;
