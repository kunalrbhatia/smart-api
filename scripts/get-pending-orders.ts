/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../src/types.d.ts" />
import dotenv from 'dotenv';
import _ from 'lodash';
import { getAuthHeaders } from '../src/helpers/apiService/session';
import { get } from '../src/helpers/api';
import { GET_ORDER_BOOK_API } from '../src/helpers/constants';
import { isPaperMode, getPaperOrders } from '../src/helpers/paperTrade';
import DataStore from '../src/store/dataStore';
import { setCredentials } from 'krb-smart-api-module';

// Load environment variables
dotenv.config();

async function main() {
  console.log('=========================================');
  console.log('      FETCHING PENDING ORDERS            ');
  console.log('=========================================');

  // Determine mode (support override via CLI flags, fallback to current config)
  let paperMode = isPaperMode();
  if (process.argv.includes('--live')) {
    paperMode = false;
  } else if (process.argv.includes('--paper')) {
    paperMode = true;
  }

  console.log(
    `Active Mode: ${paperMode ? '📝 PAPER TRADING (Mock)' : '⚡ LIVE TRADING (SmartAPI)'}`,
  );
  console.log('-----------------------------------------');

  let pendingOrders: any[] = [];

  if (paperMode) {
    console.log('Fetching paper orders from local cache...');
    const allPaperOrders = getPaperOrders();

    // Filter for pending/open paper orders
    pendingOrders = allPaperOrders.filter((order: any) => {
      const status = (order.orderstatus || order.status || '').toLowerCase();
      return status.includes('pending') || status === 'open';
    });
  } else {
    // Live Mode: Set up credentials from env
    const creds = {
      APIKEY: process.env.API_KEY || '',
      CLIENT_CODE: process.env.CLIENT_CODE || '',
      CLIENT_PIN: process.env.CLIENT_PIN || '',
      CLIENT_TOTP_PIN: process.env.CLIENT_TOTP_PIN || '',
    };

    if (
      !creds.APIKEY ||
      !creds.CLIENT_CODE ||
      !creds.CLIENT_PIN ||
      !creds.CLIENT_TOTP_PIN
    ) {
      console.error(
        '❌ Error: Missing SmartAPI credentials in your .env file.',
      );
      console.error(
        'Please configure API_KEY, CLIENT_CODE, CLIENT_PIN, and CLIENT_TOTP_PIN.',
      );
      process.exit(1);
    }

    // Set credentials in the store & module
    DataStore.getInstance().setPostData(creds);
    setCredentials(creds);

    try {
      console.log('Logging in and requesting order book...');
      const headers = await getAuthHeaders();
      const responseJson = await get(GET_ORDER_BOOK_API, headers);
      const orders = _.get(responseJson, 'data', null);

      if (!orders) {
        console.log('Order book is empty or the response returned no orders.');
        console.log('API Response:', JSON.stringify(responseJson, null, 2));
        return;
      }

      if (Array.isArray(orders)) {
        pendingOrders = orders.filter((order: any) => {
          const orderStatus = (
            _.get(order, 'orderstatus', '') as string
          ).toLowerCase();
          const status = (_.get(order, 'status', '') as string).toLowerCase();
          return (
            orderStatus.includes('pending') ||
            orderStatus === 'open' ||
            status.includes('pending') ||
            status === 'open'
          );
        });
      }
    } catch (error: any) {
      console.error(
        '❌ Failed to fetch pending orders from SmartAPI:',
        error.message || error,
      );
      process.exit(1);
    }
  }

  if (pendingOrders.length === 0) {
    console.log('🎉 No pending orders found.');
    console.log('=========================================');
    return;
  }

  console.log(`📋 Found ${pendingOrders.length} pending order(s):\n`);

  // Map to a clean, readable representation for display
  const displayTable = pendingOrders.map((o: any) => {
    return {
      'Order ID': o.orderid || o.orderId || 'N/A',
      Symbol: o.tradingsymbol || 'N/A',
      'Tx Type': o.transactiontype || o.transactionType || 'N/A',
      Variety: o.variety || 'N/A',
      Type: o.ordertype || o.orderType || 'N/A',
      Price: o.price !== undefined ? o.price : 'N/A',
      'Trigger Price':
        o.triggerprice !== undefined
          ? o.triggerprice
          : o.triggerPrice !== undefined
            ? o.triggerPrice
            : 'N/A',
      Quantity: o.quantity !== undefined ? o.quantity : 'N/A',
      Status: o.orderstatus || o.status || 'N/A',
    };
  });

  console.table(displayTable);
  console.log('=========================================');
}

main().catch(err => {
  console.error('❌ Unhandled error in script:', err);
  process.exit(1);
});
