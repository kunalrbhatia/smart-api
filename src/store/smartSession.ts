// dataStore.ts

import { ISmartApiData } from '../app.interface';
/**
 * A singleton class to store and manage smart API session data.
 */
class SmartSession {
  /**
   * The singleton instance of the SmartSession class.
   * @private
   * @static
   * @type {SmartSession}
   */
  private static instance: SmartSession;
  /**
   * The smart API session data.
   * @private
   * @type {ISmartApiData}
   */
  private postData: ISmartApiData;
  /**
   * The private constructor to create a new instance of the SmartSession.
   * @private
   */
  private constructor() {
    // Initialize postData with default values or leave it empty.
    this.postData = {
      feedToken: '',
      jwtToken: '',
      refreshToken: '',
    };
  }
  /**
   * Gets the singleton instance of the SmartSession.
   * @static
   * @returns {SmartSession} The singleton instance.
   */
  static getInstance() {
    if (!SmartSession.instance) {
      SmartSession.instance = new SmartSession();
    }
    return SmartSession.instance;
  }
  /**
   * Sets the smart API session data.
   * @param {ISmartApiData} data - The smart API session data to set.
   */
  setPostData(data: ISmartApiData) {
    this.postData = data;
  }
  /**
   * Gets the smart API session data.
   * @returns {ISmartApiData} The smart API session data.
   */
  getPostData() {
    return this.postData;
  }
}

export default SmartSession;
