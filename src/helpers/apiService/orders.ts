import { get as _get } from 'lodash';
import moment from 'moment-timezone';
import { DELAY, delay } from 'krb-smart-api-module';
import { get, post } from '../api';
import { logger } from '../logger';
import { notify } from '../notifier';
import {
  ALGO,
  ORDER_API,
  GET_ORDER_BOOK_API,
  PENDING_ORDER_STATUS,
  VARIETY_STOPLOSS,
  TRANSACTION_TYPE_BUY,
  TRANSACTION_TYPE_SELL,
  HEDGE_LOT_MULTIPLIER,
} from '../constants';
import {
  doOrderResponse,
  doOrderType,
  OrderData,
  OptionType,
  Position,
} from '../../app.interface';
import OrderStore from '../../store/orderStore';
import { getAuthHeaders } from './session';
import { getScrip, getLtpWithRetry, searchScrip } from './marketData';
import { fetchOpenPositionsByExpiry, getPositionsJson } from './positions';
import { isPaperMode, mockOrderPlacement, getPaperOrders } from '../paperTrade';

/**
 * Places an order.
 */
export const doOrder = async ({
  tradingsymbol,
  transactionType,
  symboltoken,
  productType = 'CARRYFORWARD',
  lotSize,
  variety = 'NORMAL',
  ordertype = 'MARKET',
  price,
  triggerprice,
  isHedge,
  exchange = 'NFO',
  quantity: providedQuantity,
  lots,
}: Omit<doOrderType, 'lotSize'> & {
  exchange?: string;
  quantity?: number;
  lots?: number;
  lotSize?: number;
}): Promise<doOrderResponse> => {
  // Calculate quantity - use provided quantity if given, otherwise calculate from lots/lotSize
  let quantity: number;
  if (providedQuantity === undefined) {
    if (!lotSize || lotSize <= 0) {
      throw new Error('Either quantity or lotSize must be provided');
    }
    const storedLots =
      lots || OrderStore.getInstance().getPostData().QUANTITY || 1;
    const hedgeQuantity = storedLots * HEDGE_LOT_MULTIPLIER;
    const lotsCalc = isHedge ? hedgeQuantity : storedLots;
    logger.log(
      `${ALGO}: doOrder — isHedge: ${isHedge}, lots: ${lotsCalc}, lotSize: ${lotSize}`,
    );
    quantity = Math.abs(lotSize * lotsCalc);
  } else {
    quantity = Math.abs(providedQuantity);
  }

  if (isPaperMode()) {
    return await mockOrderPlacement({
      tradingsymbol,
      transactionType,
      symboltoken,
      productType,
      lotSize: lotSize || 0,
      variety,
      ordertype,
      price,
      triggerprice,
      isHedge,
      quantity,
      exchange,
    });
  }

  const data = {
    exchange,
    tradingsymbol,
    symboltoken,
    quantity: quantity,
    disclosedquantity: quantity,
    transactiontype: transactionType,
    ordertype,
    variety,
    producttype: productType,
    duration: 'DAY',
    price,
    triggerprice,
  };
  logger.log(
    `${ALGO}: Placing ${transactionType} order for ${tradingsymbol} (Qty: ${quantity})`,
  );
  const headers = await getAuthHeaders();
  try {
    const response = await post(ORDER_API, data, headers);
    logger.log(`${ALGO}: doOrder response for ${tradingsymbol}:`, response);
    return response;
  } catch (error) {
    logger.error(`${ALGO}: doOrder failed for ${tradingsymbol}:`, error);
    throw error;
  }
};

/**
 * Places an order by strike price.
 */
export const doOrderByStrike = async (
  strike: number,
  optionType: OptionType,
  transactionType: 'BUY' | 'SELL',
  isHedge = false,
): Promise<OrderData | boolean> => {
  try {
    const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
    await delay({ milliSeconds: DELAY });
    const formattedExpiry = moment(expiryDate, 'DDMMMYYYY')
      .format('DDMMMYY')
      .toUpperCase();
    const scripName = `${OrderStore.getInstance().getPostData().INDEX}${formattedExpiry}${strike.toString()}${optionType}`;

    // Check if scrip exists
    await searchScrip(scripName);

    const token = await getScrip({
      scriptName: OrderStore.getInstance().getPostData().INDEX,
      expiryDate: expiryDate,
      optionType: optionType,
      strikePrice: strike.toString(),
    });

    const ltpData = await getLtpWithRetry({
      exchange: _get(token, '0.exch_seg', ''),
      symboltoken: _get(token, '0.token', ''),
      tradingsymbol: _get(token, '0.symbol', ''),
    });

    await delay({ milliSeconds: DELAY });
    const lotsize = _get(token, '0.lotsize', '0') || '0';

    // IF IS HEDGE WRITE LOGIC TO CHECK IF LTP IS LESS THAN 3 PREMIUM THEN ONLY GO AHEAD
    if (isHedge && ltpData.ltp > 3) {
      logger.log(
        `${ALGO}: Skipping hedge ${scripName} as LTP (${ltpData.ltp}) > 3`,
      );
      return false;
    }
    const orderData = await doOrder({
      tradingsymbol: _get(token, '0.symbol', ''),
      symboltoken: _get(token, '0.token', ''),
      transactionType: transactionType,
      lotSize: Number.parseInt(lotsize),
      variety: 'NORMAL',
      ordertype: 'MARKET',
      isHedge,
    });
    logger.log(`${ALGO}: Order ${scripName} status: ${orderData.status}`);
    return {
      stikePrice: strike.toString(),
      expiryDate: expiryDate,
      token: _get(token, '0.token', ''),
      symbol: _get(token, '0.symbol', ''),
      exchange: _get(token, '0.exch_seg', ''),
      status: orderData.status,
    };
  } catch (error) {
    logger.error(
      `${ALGO}: doOrderByStrike failed for ${strike} ${optionType}:`,
      error,
    );
    throw error;
  }
};

/**
 * Fetches the pending orders from the order book.
 */
export const getPendingOrders = async (): Promise<
  Record<string, unknown>[]
> => {
  if (isPaperMode()) {
    return getPaperOrders();
  }
  try {
    const headers = await getAuthHeaders();
    const response = await get(GET_ORDER_BOOK_API, headers);
    const orders = _get(response, 'data', []);
    // Filter for pending stop loss orders
    const pendingOrders = Array.isArray(orders)
      ? orders.filter(
          (order: Record<string, unknown>) =>
            _get(order, 'status', '') === PENDING_ORDER_STATUS &&
            _get(order, 'variety', '') === VARIETY_STOPLOSS,
        )
      : [];
    return pendingOrders;
  } catch (error) {
    const errorMessage = `${ALGO}: getPendingOrders failed error below`;
    logger.error(errorMessage, error);
    return [];
  }
};

/**
 * Checks if a stop loss order already exists for a given position.
 */
export const hasStopLossOrderForPosition = (
  position: Position,
  pendingOrders: Record<string, unknown>[],
): boolean => {
  const tradingSymbol = position.tradingsymbol;
  const optionType = position.optiontype;
  const strikePrice = position.strikeprice;

  return pendingOrders.some(
    (order: Record<string, unknown>) =>
      _get(order, 'tradingsymbol', '') === tradingSymbol &&
      _get(order, 'optiontype', '') === optionType &&
      _get(order, 'strikeprice', '') === strikePrice,
  );
};

/**
 * Places a stop loss order for a single position.
 */
export const placeStopLossOrder = async (
  position: Position,
  stoplossPercentage: number = 125,
): Promise<doOrderResponse | null> => {
  try {
    await delay({ milliSeconds: DELAY });
    const netQty = Number.parseInt(position.netqty);
    const tradingsymbol = position.tradingsymbol;
    // If sold (netQty negative), we buy to close; if bought (netQty positive), we sell to close
    const transactionType =
      netQty < 0 ? TRANSACTION_TYPE_BUY : TRANSACTION_TYPE_SELL;
    if (transactionType === TRANSACTION_TYPE_BUY) {
      const symboltoken = position.symboltoken;
      const lotSize = Number.parseInt(position.lotsize);

      // Calculate stop loss price based on average price and percentage
      const entryPrice = Math.abs(
        Number.parseFloat(position.netvalue) / netQty,
      );
      const stoplossPrice =
        entryPrice + entryPrice * (stoplossPercentage / 100);

      // Round to nearest 0.05
      const triggerPriceRounded = Math.round(stoplossPrice * 20) / 20;
      // Add a 5% buffer for the limit price to ensure execution
      const limitPriceRounded = Math.round(stoplossPrice * 1.05 * 20) / 20;

      logger.log(
        `${ALGO}: placeStopLossOrder for ${tradingsymbol} - entry price: ${entryPrice}, trigger price: ${triggerPriceRounded}, limit price: ${limitPriceRounded}`,
      );

      const stoplossStatus = await doOrder({
        tradingsymbol,
        transactionType,
        symboltoken,
        lotSize,
        variety: VARIETY_STOPLOSS,
        ordertype: 'STOPLOSS_LIMIT',
        price: limitPriceRounded,
        triggerprice: triggerPriceRounded,
      });
      logger.log(
        `${ALGO}: placeStopLossOrder status for ${tradingsymbol}:`,
        stoplossStatus,
      );
      if (stoplossStatus.status) {
        await notify(
          `Stop Loss order placed for ${tradingsymbol} at Trigger: ${triggerPriceRounded.toFixed(2)}, Limit: ${limitPriceRounded.toFixed(2)}`,
        );
      }
      return stoplossStatus;
    }
    return null;
  } catch (error) {
    const errorMessage = `${ALGO}: placeStopLossOrder failed for ${position.tradingsymbol}`;
    logger.error(errorMessage, error);
    return null;
  }
};

/**
 * Places stop loss orders on all open positions that don't already have one.
 */
export const placeStopLossOnAllTrades = async (
  stoplossPercentage: number = 125,
  positions?: Position[],
): Promise<void> => {
  try {
    logger.log(
      `${ALGO}: Starting placeStopLossOnAllTrades with ${stoplossPercentage}% stop loss`,
    );

    // Get existing pending orders
    const pendingOrders = await getPendingOrders();
    logger.log(
      `${ALGO}: Found ${pendingOrders.length} existing pending stop loss orders`,
    );

    // Get open positions (only sell positions)
    let openSellPositions: Position[] = [];
    if (positions) {
      const { getOpenSellPositions } = await import('../functions');
      openSellPositions = getOpenSellPositions(positions);
    } else {
      openSellPositions = await getPositionsJson(false);
    }

    logger.log(
      `${ALGO}: Found ${openSellPositions.length} open sell positions`,
    );

    if (!Array.isArray(openSellPositions) || openSellPositions.length === 0) {
      logger.log(
        `${ALGO}: No open positions found, nothing to place stop loss orders for`,
      );
      return;
    }

    // Filter positions that don't have a stop loss order yet
    const positionsWithoutStopLoss = openSellPositions.filter(
      (position: Position) =>
        !hasStopLossOrderForPosition(position, pendingOrders),
    );
    logger.log(
      `${ALGO}: ${positionsWithoutStopLoss.length} positions need stop loss orders (${openSellPositions.length - positionsWithoutStopLoss.length} already have them)`,
    );

    // Place stop loss orders for positions without them
    for (const position of positionsWithoutStopLoss) {
      await placeStopLossOrder(position, stoplossPercentage);
    }

    logger.log(`${ALGO}: Completed placeStopLossOnAllTrades`);
  } catch (error) {
    const errorMessage = `${ALGO}: placeStopLossOnAllTrades failed`;
    logger.error(errorMessage, error);
  }
};

/**
 * Places stoploss orders for all sell positions that don't already have one.
 */
export const placeStoplossForAllSells = async ({
  index,
  expiry,
  stoplossFactor = 1.5,
}: {
  index: string;
  expiry: string;
  stoplossFactor?: number;
}) => {
  logger.log(
    `${ALGO}: placeStoplossForAllSells — index: ${index}, expiry: ${expiry}, factor: ${stoplossFactor}`,
  );

  // ── Step 1: Get all SELL positions ───────────────────────────────
  logger.log(
    `${ALGO}: Fetching sell positions for index: ${index}, expiry: ${expiry}`,
  );
  const sellPositions = await fetchOpenPositionsByExpiry(index, expiry, 'SELL');

  if (sellPositions.length === 0) {
    logger.log(
      `${ALGO}: No sell positions found, nothing to place stoploss for`,
    );
    return {
      index,
      expiry,
      stoplossFactor,
      sellPositionCount: 0,
      stoplossOrders: [],
    };
  }

  logger.log(`${ALGO}: Found ${sellPositions.length} sell positions`);

  // ── Step 2: Get existing pending stoploss orders ─────────────────
  const headers = await getAuthHeaders();
  let pendingOrders: Record<string, unknown>[] = [];
  try {
    const response = await get(GET_ORDER_BOOK_API, headers);
    const orders = _get(response, 'data', []);
    pendingOrders = Array.isArray(orders)
      ? orders.filter(
          (order: Record<string, unknown>) =>
            _get(order, 'status', '') === PENDING_ORDER_STATUS &&
            _get(order, 'variety', '') === VARIETY_STOPLOSS,
        )
      : [];
  } catch (error) {
    logger.warn(
      `${ALGO}: Failed to fetch pending orders, continuing without dedup:`,
      error,
    );
  }

  // ── Step 3: Place stoploss for each sell position ────────────────
  const stoplossOrders = [];
  for (const position of sellPositions) {
    const tradingsymbol = position.tradingsymbol;
    const symboltoken = position.symboltoken;
    const netqty = Number.parseInt(position.netqty);
    const sellavgprice = Number.parseFloat(position.cfsellavgprice);

    if (!sellavgprice || sellavgprice <= 0) {
      stoplossOrders.push({
        tradingsymbol,
        symboltoken,
        status: 'skipped',
        reason: `Invalid price`,
      });
      continue;
    }

    const hasExistingStoploss = pendingOrders.some(
      (order: Record<string, unknown>) =>
        _get(order, 'tradingsymbol', '') === tradingsymbol &&
        _get(order, 'symboltoken', '') === symboltoken,
    );

    if (hasExistingStoploss) {
      stoplossOrders.push({
        tradingsymbol,
        symboltoken,
        status: 'skipped',
        reason: 'Already exists',
      });
      continue;
    }

    const stoplossPrice = sellavgprice + sellavgprice * stoplossFactor;
    // Round to nearest 0.05
    const triggerPriceRounded = Math.round(stoplossPrice * 20) / 20;
    // Add a 5% buffer for the limit price to ensure execution
    const limitPriceRounded = Math.round(stoplossPrice * 1.05 * 20) / 20;
    const quantity = Math.abs(netqty);

    try {
      await delay({ milliSeconds: DELAY });
      const orderResponse = await doOrder({
        tradingsymbol,
        symboltoken,
        transactionType: TRANSACTION_TYPE_BUY,
        exchange: 'NFO',
        quantity,
        variety: VARIETY_STOPLOSS as 'STOPLOSS',
        ordertype: 'STOPLOSS_LIMIT' as const,
        productType: 'CARRYFORWARD' as const,
        price: limitPriceRounded,
        triggerprice: triggerPriceRounded,
      });

      stoplossOrders.push({
        tradingsymbol,
        symboltoken,
        status: orderResponse.status,
        orderId: orderResponse.data?.orderid,
      });
    } catch (error) {
      stoplossOrders.push({ tradingsymbol, symboltoken, status: 'failed' });
    }
  }

  return {
    index,
    expiry,
    stoplossFactor,
    sellPositionCount: sellPositions.length,
    stoplossOrders,
  };
};
