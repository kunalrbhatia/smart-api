import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { Position, doOrderType, doOrderResponse } from '../app.interface';
import OrderStore from '../store/orderStore';

const PAPER_MODE_FILE = path.join(process.cwd(), '.paper-trade');
const PAPER_POSITIONS_FILE = path.join(process.cwd(), 'paper-positions.json');
const PAPER_ORDERS_FILE = path.join(process.cwd(), 'paper-orders.json');

/**
 * Checks if paper trading mode is active.
 * @returns {boolean} True if paper mode is active.
 */
export const isPaperMode = (): boolean => {
  return fs.existsSync(PAPER_MODE_FILE);
};

/**
 * Toggles paper trading mode.
 * @param {boolean} active - True to enable, false to disable.
 */
export const setPaperMode = (active: boolean): void => {
  if (active) {
    fs.writeFileSync(PAPER_MODE_FILE, '');
    logger.info('[PAPER] Paper trading mode ENABLED');
  } else {
    if (fs.existsSync(PAPER_MODE_FILE)) {
      fs.unlinkSync(PAPER_MODE_FILE);
    }
    // Also clear paper positions and orders when disabling?
    // The blueprint doesn't say, but usually it's better to keep them or clear them explicitly.
    // I'll keep them for now.
    logger.info('[PAPER] Paper trading mode DISABLED');
  }
};

/**
 * Gets paper positions from the local file.
 */
export const getPaperPositions = (): Position[] => {
  if (!fs.existsSync(PAPER_POSITIONS_FILE)) return [];
  try {
    const data = fs.readFileSync(PAPER_POSITIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    logger.error('[PAPER] Failed to read paper positions:', err);
    return [];
  }
};

/**
 * Saves paper positions to the local file.
 */
export const savePaperPositions = (positions: Position[]): void => {
  try {
    fs.writeFileSync(PAPER_POSITIONS_FILE, JSON.stringify(positions, null, 2));
  } catch (err) {
    logger.error('[PAPER] Failed to save paper positions:', err);
  }
};

/**
 * Gets paper orders from the local file.
 */
export const getPaperOrders = (): any[] => {
  if (!fs.existsSync(PAPER_ORDERS_FILE)) return [];
  try {
    const data = fs.readFileSync(PAPER_ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    logger.error('[PAPER] Failed to read paper orders:', err);
    return [];
  }
};

/**
 * Saves paper orders to the local file.
 */
export const savePaperOrders = (orders: any[]): void => {
  try {
    fs.writeFileSync(PAPER_ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (err) {
    logger.error('[PAPER] Failed to save paper orders:', err);
  }
};

/**
 * Mocks an order placement and updates local paper state.
 */
export const mockOrderPlacement = async (
  params: doOrderType & { quantity: number; ltp?: number; exchange?: string },
): Promise<doOrderResponse> => {
  const paperId = `PAPER-${Date.now()}`;
  logger.info(`[PAPER] Mocking order: ${paperId} for ${params.tradingsymbol}`);

  if (params.variety === 'STOPLOSS' || params.ordertype.includes('STOPLOSS')) {
    // Store as pending order
    const orders = getPaperOrders();
    orders.push({
      ...params,
      orderid: paperId,
      status: 'Pending',
      orderstatus: 'Pending',
    });
    savePaperOrders(orders);
  } else {
    // Market order - update positions immediately
    const positions = getPaperPositions();
    const existingIdx = positions.findIndex(
      p => p.symboltoken === params.symboltoken,
    );

    const quantity = params.quantity || 0;
    const qty = params.transactionType === 'BUY' ? quantity : -quantity;
    let price = params.price || params.ltp || 0;

    if (price === 0) {
      try {
        const { getLtpWithRetry } = await import('./apiService/marketData');
        const ltpData = await getLtpWithRetry({
          exchange: params.exchange || 'NFO',
          symboltoken: params.symboltoken,
          tradingsymbol: params.tradingsymbol,
        });
        if (ltpData && ltpData.ltp) {
          price = ltpData.ltp;
          logger.info(
            `[PAPER] Fetched live LTP for ${params.tradingsymbol}: ${price}`,
          );
        }
      } catch (err) {
        logger.error(
          `[PAPER] Failed to fetch live LTP for ${params.tradingsymbol} during mock order placement:`,
          err,
        );
      }
    }

    if (existingIdx >= 0) {
      const p = positions[existingIdx];
      const oldNetQty = Number.parseInt(p.netqty);
      const newNetQty = oldNetQty + qty;

      p.netqty = newNetQty.toString();
      if (params.transactionType === 'BUY') {
        const oldBuyQty = Number.parseInt(p.buyqty);
        const oldBuyVal = Number.parseFloat(p.totalbuyvalue);
        p.buyqty = (oldBuyQty + quantity).toString();
        p.totalbuyvalue = (oldBuyVal + quantity * price).toString();
        p.buyavgprice = (
          Number.parseFloat(p.totalbuyvalue) / Number.parseInt(p.buyqty)
        ).toString();
      } else {
        const oldSellQty = Number.parseInt(p.sellqty);
        const oldSellVal = Number.parseFloat(p.totalsellvalue);
        p.sellqty = (oldSellQty + quantity).toString();
        p.totalsellvalue = (oldSellVal + quantity * price).toString();
        p.sellavgprice = (
          Number.parseFloat(p.totalsellvalue) / Number.parseInt(p.sellqty)
        ).toString();
      }
      p.netvalue = (
        Number.parseFloat(p.totalbuyvalue) - Number.parseFloat(p.totalsellvalue)
      ).toString();
      // Simple realised P&L calculation (not perfect but enough for paper)
      if (oldNetQty < 0 && qty > 0) {
        // Covering a short
        const coveredQty = Math.min(Math.abs(oldNetQty), qty);
        const sellAvg = Number.parseFloat(p.sellavgprice);
        p.realised = (
          Number.parseFloat(p.realised) +
          coveredQty * (sellAvg - price)
        ).toString();
      } else if (oldNetQty > 0 && qty < 0) {
        // Selling a long
        const soldQty = Math.min(oldNetQty, Math.abs(qty));
        const buyAvg = Number.parseFloat(p.buyavgprice);
        p.realised = (
          Number.parseFloat(p.realised) +
          soldQty * (price - buyAvg)
        ).toString();
      }
    } else {
      // Create new position
      const postData = OrderStore.getInstance().getPostData();

      // Extract strikeprice and optiontype from tradingsymbol (e.g. NIFTY09JUN2623200CE)
      let strikeprice = '0';
      let optiontype: 'CE' | 'PE' = 'CE';
      const symbolRegex = /^([A-Z]+)(\d{2}[A-Z]{3}\d{2})(\d+\.?\d*)([CP]E)$/;
      const match = params.tradingsymbol.match(symbolRegex);
      if (match) {
        strikeprice = match[3];
        optiontype = match[4] as 'CE' | 'PE';
      }

      const newPos: Partial<Position> = {
        symboltoken: params.symboltoken,
        tradingsymbol: params.tradingsymbol,
        symbolname:
          postData.INDEX ||
          (params.tradingsymbol.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY'),
        expirydate: postData.EXPIRYDATE,
        exchange: 'NFO',
        strikeprice,
        optiontype,
        netqty: qty.toString(),
        buyqty: params.transactionType === 'BUY' ? quantity.toString() : '0',
        sellqty: params.transactionType === 'SELL' ? quantity.toString() : '0',
        totalbuyvalue:
          params.transactionType === 'BUY'
            ? (quantity * price).toString()
            : '0',
        totalsellvalue:
          params.transactionType === 'SELL'
            ? (quantity * price).toString()
            : '0',
        buyavgprice: params.transactionType === 'BUY' ? price.toString() : '0',
        sellavgprice:
          params.transactionType === 'SELL' ? price.toString() : '0',
        netvalue: (params.transactionType === 'BUY'
          ? quantity * price
          : -(quantity * price)
        ).toString(),
        realised: '0',
        unrealised: '0',
        ltp: price.toString(),
        lotsize: params.lotSize?.toString() || '1',
        instrumenttype: 'OPTIDX',
      };
      positions.push(newPos as Position);
    }
    savePaperPositions(positions);
  }

  return {
    status: true,
    message: 'SUCCESS',
    errorcode: '',
    data: {
      script: params.tradingsymbol,
      orderid: paperId,
    },
  };
};

/**
 * Checks pending paper orders and fills them if trigger price is hit.
 */
export const checkAndFillPaperOrders = async (): Promise<void> => {
  if (!isPaperMode()) return;

  const orders = getPaperOrders();
  if (orders.length === 0) return;

  const pendingOrders = orders.filter(o => o.status === 'Pending');
  if (pendingOrders.length === 0) return;

  const { getLtpWithRetry } = await import('./apiService/marketData');
  const updatedOrders = [...orders];
  let positionsChanged = false;

  for (const order of pendingOrders) {
    try {
      const ltpData = await getLtpWithRetry({
        exchange: order.exchange || 'NFO',
        symboltoken: order.symboltoken,
        tradingsymbol: order.tradingsymbol,
      });

      if (ltpData && ltpData.ltp) {
        let isHit = false;
        if (order.transactionType === 'BUY') {
          // For a BUY SL (stopping a SELL), trigger if LTP >= triggerprice
          isHit = ltpData.ltp >= order.triggerprice;
        } else {
          // For a SELL SL (stopping a BUY), trigger if LTP <= triggerprice
          isHit = ltpData.ltp <= order.triggerprice;
        }

        if (isHit) {
          logger.info(
            `[PAPER] SL Hit for ${order.tradingsymbol} at ${ltpData.ltp} (Trigger: ${order.triggerprice})`,
          );
          // Execute the order
          const orderIdx = updatedOrders.findIndex(
            o => o.orderid === order.orderid,
          );
          updatedOrders[orderIdx].status = 'Completed';
          updatedOrders[orderIdx].orderstatus = 'Completed';
          updatedOrders[orderIdx].averageprice = ltpData.ltp.toString();

          // Update positions
          await mockOrderPlacement({
            ...order,
            variety: 'NORMAL',
            ordertype: 'MARKET',
            price: ltpData.ltp,
          });
          positionsChanged = true;
        }
      }
    } catch (e) {
      logger.error(
        `[PAPER] Failed to check trigger for order ${order.orderid}`,
        e,
      );
    }
  }

  if (positionsChanged) {
    savePaperOrders(updatedOrders);
  }
};
