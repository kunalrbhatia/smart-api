import { child, get, getDatabase, push, ref, update } from 'firebase/database';
import { JsonFileStructure, Strategy } from '../app.interface';
import { initializeApp } from 'firebase/app';
import _get from 'lodash/get';
import moment from 'moment-timezone';
const firebaseConfig = {
  apiKey: 'AIzaSyA7kZaNsFKIg2gi176ECFCBFqMiHVYLSzQ',
  authDomain: 'smart-api-840b7.firebaseapp.com',
  databaseURL: 'https://smart-api-840b7-default-rtdb.firebaseio.com',
  projectId: 'smart-api-840b7',
  storageBucket: 'smart-api-840b7.appspot.com',
  messagingSenderId: '858775846844',
  appId: '1:858775846844:web:a4504edfcf5108135175b9',
  measurementId: 'G-6EJTK80RSE',
};
const firebase_app = initializeApp(firebaseConfig);
const db = getDatabase(firebase_app);
export const findTrade = async (strategy: Strategy) => {
  const dbRef = ref(db);
  return get(child(dbRef, `${strategy}/trades/`))
    .then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (let key in data) {
          // key will be each key in the object
          const object: JsonFileStructure = _get(data, key, {}) || {};
          if (object.tradeDate === moment().format('DD/MM/YYYY')) {
            return object;
          }
        }
      } else {
        console.log('No data available');
      }
    })
    .catch((error) => {
      console.error(error);
    });
};
export const makeNewTrade = async (
  strategy: Strategy,
  json: JsonFileStructure
) => {
  const tradeKey = push(child(ref(db), `${strategy}/trades/`)).key;
  const updates: { [key: string]: JsonFileStructure } = {};
  updates[`${strategy}/trades/` + tradeKey] = json;
  await update(ref(db), updates);
  //return tradeKey;
  // const db = getDatabase();
  // if (json) set(ref(db, `${strategy}/trades/`), json);
  // else set(ref(db, `${strategy}/trades/`), {});
};
