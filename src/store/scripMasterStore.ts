// ScripMasterStore.ts

import { ScripMasterStoreDataType } from '../app.interface';

class ScripMasterStore {
  private static instance: ScripMasterStore;
  private postData: ScripMasterStoreDataType;

  private constructor() {
    // Initialize postData with default values or leave it empty.
    this.postData = {
      SCRIP_MASTER_JSON: [],
    };
  }

  static getInstance() {
    if (!ScripMasterStore.instance) {
      ScripMasterStore.instance = new ScripMasterStore();
    }
    return ScripMasterStore.instance;
  }

  setPostData(data: ScripMasterStoreDataType) {
    this.postData = data;
  }

  getPostData() {
    return this.postData;
  }
}

export default ScripMasterStore;
