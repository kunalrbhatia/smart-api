// orderStore.ts

import { OrderStoreDataType } from '../app.interface';
import { getNextExpiry } from '../helpers/functions';
/**
 * A singleton class to store and manage order data.
 */
class OrderStore {
  /**
   * The singleton instance of the OrderStore class.
   * @private
   * @static
   * @type {OrderStore}
   */
  private static instance: OrderStore;
  /**
   * The order data.
   * @private
   * @type {OrderStoreDataType}
   */
  private postData: OrderStoreDataType;
  /**
   * The private constructor to create a new instance of the OrderStore.
   * @private
   */
  private constructor() {
    this.postData = {
      QUANTITY: 0,
      EXPIRYDATE: getNextExpiry(),
      INDEX: '',
      LOSSPERLOT: 0,
      INDIAVIX: 0,
      MTM_BASELINE: 0,
      straddleOpenedToday: false,
    };
  }
  /**
   * Gets the singleton instance of the OrderStore.
   * @static
   * @returns {OrderStore} The singleton instance.
   */
  static getInstance() {
    if (!OrderStore.instance) {
      OrderStore.instance = new OrderStore();
    }
    return OrderStore.instance;
  }
  /**
   * Sets the order data.
   * @param {OrderStoreDataType} data - The order data to set.
   */
  setPostData(data: OrderStoreDataType) {
    this.postData = data;
  }
  /**
   * Gets the order data.
   * @returns {OrderStoreDataType} The order data.
   */
  getPostData() {
    return this.postData;
  }
}
export default OrderStore;
