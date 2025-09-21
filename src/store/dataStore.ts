// dataStore.ts

import { Credentails } from '../app.interface';
/**
 * A singleton class to store and manage credentials.
 */
class DataStore {
  /**
   * The singleton instance of the DataStore class.
   * @private
   * @static
   * @type {DataStore}
   */
  private static instance: DataStore;
  /**
   * The credentials data.
   * @private
   * @type {Credentails}
   */
  private postData: Credentails;
  /**
   * The private constructor to create a new instance of the DataStore.
   * @private
   */
  private constructor() {
    // Initialize postData with default values or leave it empty.
    this.postData = {
      APIKEY: '',
      CLIENT_CODE: '',
      CLIENT_PIN: '',
      CLIENT_TOTP_PIN: '',
    };
  }
  /**
   * Gets the singleton instance of the DataStore.
   * @static
   * @returns {DataStore} The singleton instance.
   */
  static getInstance() {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }
  /**
   * Sets the credentials data.
   * @param {Credentails} data - The credentials data to set.
   */
  setPostData(data: Credentails) {
    this.postData = data;
  }
  /**
   * Gets the credentials data.
   * @returns {Credentails} The credentials data.
   */
  getPostData() {
    return this.postData;
  }
}

export default DataStore;
