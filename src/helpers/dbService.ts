import { child, get, getDatabase, push, ref, update } from "firebase/database";
import { DataRecord } from "../app.interface";
import { initializeApp } from "firebase/app";
import _get from "lodash/get";
const firebaseConfig = {
  apiKey: "AIzaSyA7kZaNsFKIg2gi176ECFCBFqMiHVYLSzQ",
  authDomain: "smart-api-840b7.firebaseapp.com",
  databaseURL: "https://smart-api-840b7-default-rtdb.firebaseio.com",
  projectId: "smart-api-840b7",
  storageBucket: "smart-api-840b7.appspot.com",
  messagingSenderId: "858775846844",
  appId: "1:858775846844:web:a4504edfcf5108135175b9",
  measurementId: "G-6EJTK80RSE",
};
const firebase_app = initializeApp(firebaseConfig);
const db = getDatabase(firebase_app);
export const recordNewTrade = async (json: DataRecord) => {
  const tradeKey = push(child(ref(db), `trades/`)).key;
  const updates: { [key: string]: DataRecord } = {};
  updates[`trades/` + tradeKey] = json;
  await update(ref(db), updates);
};
