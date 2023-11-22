// orderStore.ts

import { OrderStoreDataType } from '../app.interface';

class OrderStore {
  private static instance: OrderStore;
  private postData: OrderStoreDataType;

  private constructor() {
    // Initialize postData with default values or leave it empty.
    this.postData = {
      QUANTITY: 0,
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
