// ScripMasterStore.ts

import { ScripMasterStoreDataType } from '../app.interface';
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
   * The timestamp when the data was last set.
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
   * Checks if the stored data is expired (more than 24 hours old).
   * @returns {boolean} True if expired, false otherwise.
   */
  isExpired() {
    if (this.lastSetTimestamp === 0) return true;
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    return Date.now() - this.lastSetTimestamp > twentyFourHoursInMs;
  }
}

export default ScripMasterStore;
