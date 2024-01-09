// orderStore.ts

import { OrderStoreDataType } from '../app.interface';
import { getNextExpiry } from '../helpers/functions';

class OrderStore {
  private static instance: OrderStore;
  private postData: OrderStoreDataType;
  private constructor() {
    this.postData = {
      QUANTITY: 0,
      EXPIRYDATE: getNextExpiry(),
      INDEX: '',
      LOSSPERLOT: 0,
    };
  }
  static getInstance() {
    if (!OrderStore.instance) {
      OrderStore.instance = new OrderStore();
    }
    return OrderStore.instance;
  }
  setPostData(data: OrderStoreDataType) {
    this.postData = data;
  }
  getPostData() {
    return this.postData;
  }
}
export default OrderStore;
