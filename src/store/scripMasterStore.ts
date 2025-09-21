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
   * The private constructor to create a new instance of the ScripMasterStore.
   * @private
   */
  private constructor() {
    // Initialize postData with default values or leave it empty.
    this.postData = {
      SCRIP_MASTER_JSON: [],
    };
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
  }
  /**
   * Gets the scrip master data.
   * @returns {ScripMasterStoreDataType} The scrip master data.
   */
  getPostData() {
    return this.postData;
  }
}

export default ScripMasterStore;
