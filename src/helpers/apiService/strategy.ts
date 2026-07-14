import moment from 'moment-timezone';
import { isEmpty } from 'lodash';
import {
  DELAY,
  delay,
  isCurrentTimeGreater,
  isTradingHoliday,
  getNearestStrike,
  getCredentials,
} from 'krb-smart-api-module';
import { logger } from '../logger';
import { notify } from '../notifier';
import { ALGO, LOSSPERLOT, LOTS, MESSAGE_NOT_TAKE_TRADE } from '../constants';
import {
  BothPresent,
  CheckOptionType,
  OptionType,
  INDICES,
  Position,
} from '../../app.interface';
import {
  areBothOptionTypesPresentForStrike,
  checkStrike,
  getAtmStrikePrice,
  getStrikeDifference,
  hedgeCalculation,
  isMarketClosed,
  getOpenSellPositions,
} from '../functions';
import OrderStore from '../../store/orderStore';
import { getSmartSession } from './session';
import { isKillSwitchActive } from '../killSwitch';
import {
  getNearestWeeklyExpiry,
  getLtpWithRetry,
  getScrip,
  getIndexScrip,
} from './marketData';
import { doOrderByStrike, placeStopLossOnAllTrades } from './orders';
import {
  getPositions,
  getPositionsJson,
  closeTrade,
  getMtm,
} from './positions';
import { checkAndFillPaperOrders, isPaperMode } from '../paperTrade';

/**
 * Creates a short straddle position.
 */
export const shortStraddle = async (isBuyHedge = false) => {
  try {
    const atmStrike = await getAtmStrikePrice();
    const index = OrderStore.getInstance().getPostData().INDEX;
    const hedgeVariance = hedgeCalculation(index);
    const strikeDiff = getStrikeDifference(index);
    logger.log(
      `${ALGO}: Executing short straddle. ATM: ${atmStrike}, Hedge: ${isBuyHedge}, Strike Diff: ${strikeDiff}`,
    );

    if (isBuyHedge) {
      let strikeVariance = 0;
      if (index === INDICES.NIFTY) {
        strikeVariance = 50;
      }
      let strikeIncrement = strikeVariance;

      let ceHedge = await doOrderByStrike(
        atmStrike + hedgeVariance,
        OptionType.CE,
        'BUY',
        true,
      );
      while (typeof ceHedge === 'boolean' && ceHedge === false) {
        ceHedge = await doOrderByStrike(
          atmStrike + hedgeVariance + strikeIncrement,
          OptionType.CE,
          'BUY',
          true,
        );
        strikeIncrement += strikeVariance;
      }

      let peHedge = await doOrderByStrike(
        atmStrike - hedgeVariance,
        OptionType.PE,
        'BUY',
        true,
      );
      while (typeof peHedge === 'boolean' && peHedge === false) {
        peHedge = await doOrderByStrike(
          atmStrike - hedgeVariance - strikeIncrement,
          OptionType.PE,
          'BUY',
          true,
        );
        strikeIncrement -= strikeVariance;
      }
    }
    await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
    await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
  } catch (error) {
    logger.error(`${ALGO}: shortStraddle failed:`, error);
    throw error;
  }
};

/**
 * Checks if both CE and PE options are present for a strike.
 */
export const checkBoth_CE_PE_Present = (data: BothPresent) => {
  if (data.ce && data.pe) return CheckOptionType.BOTH_CE_PE_PRESENT;
  else if (!data.ce && !data.pe) return CheckOptionType.BOTH_CE_PE_NOT_PRESENT;
  else if (!data.ce && data.pe) return CheckOptionType.ONLY_PE_PRESENT;
  else return CheckOptionType.ONLY_CE_PRESENT;
};

/**
 * Checks and manages both legs of a straddle.
 */
export const checkBothLegs = async ({
  cepe_present,
  atmStrike,
}: {
  cepe_present: CheckOptionType;
  atmStrike: number;
}) => {
  try {
    if (cepe_present === CheckOptionType.BOTH_CE_PE_NOT_PRESENT) {
      await shortStraddle();
    } else if (cepe_present === CheckOptionType.ONLY_CE_PRESENT) {
      const token = await getScrip({
        scriptName: OrderStore.getInstance().getPostData().INDEX,
        expiryDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
        optionType: OptionType.PE,
        strikePrice: atmStrike.toString(),
      });
      const ltpData = await getLtpWithRetry({
        exchange: token[0].exch_seg,
        symboltoken: token[0].token,
        tradingsymbol: token[0].symbol,
      });
      if (ltpData.ltp > 5) {
        await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
      }
    } else if (cepe_present === CheckOptionType.ONLY_PE_PRESENT) {
      const token = await getScrip({
        scriptName: OrderStore.getInstance().getPostData().INDEX,
        expiryDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
        optionType: OptionType.CE,
        strikePrice: atmStrike.toString(),
      });
      const ltpData = await getLtpWithRetry({
        exchange: token[0].exch_seg,
        symboltoken: token[0].token,
        tradingsymbol: token[0].symbol,
      });
      if (ltpData.ltp > 5) {
        await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
      }
    }
  } catch (error) {
    logger.error(`${ALGO}: checkBothLegs failed:`, error);
    throw error;
  }
};

/**
 * Repeats the short straddle strategy if conditions are met.
 */
export const repeatShortStraddle = async (
  difference: number,
  atmStrike: number,
) => {
  try {
    const idx = OrderStore.getInstance().getPostData().INDEX;
    const strikeDiff = getStrikeDifference(idx);
    const positions = await getPositionsJson();
    const isSameStrikeAlreadyTraded = checkStrike(
      positions,
      atmStrike.toString(),
    );
    const result = areBothOptionTypesPresentForStrike(
      positions,
      atmStrike.toString(),
    );
    const cepe_present = checkBoth_CE_PE_Present(result);

    if (
      Math.abs(difference) >= strikeDiff &&
      isSameStrikeAlreadyTraded === false
    ) {
      await checkBothLegs({ cepe_present, atmStrike });
    } else if (difference === 0 && isSameStrikeAlreadyTraded) {
      await checkBothLegs({ cepe_present, atmStrike });
    }
  } catch (error) {
    logger.error(`${ALGO}: repeatShortStraddle failed:`, error);
    throw error;
  }
};

/**
 * Executes a short straddle for specific strikes.
 */
export const shortStraddleByStrikes = async (
  ceStrike: number,
  peStrike: number,
  isHedge = false,
) => {
  const ceOrder = await doOrderByStrike(
    ceStrike,
    OptionType.CE,
    'SELL',
    isHedge,
  );
  const peOrder = await doOrderByStrike(
    peStrike,
    OptionType.PE,
    'SELL',
    isHedge,
  );
  return [ceOrder, peOrder];
};

/**
 * Checks if the short straddle strategy should be repeated.

 */
export const checkToRepeatShortStraddle = async (
  atmStrike: number,
  previousTradeStrikePrice: number,
) => {
  if (Number.isFinite(atmStrike)) {
    const difference = atmStrike - previousTradeStrikePrice;
    await delay({ milliSeconds: DELAY });
    await repeatShortStraddle(difference, atmStrike);
  } else {
    throw new Error(`Oops, atmStrike is infinity! Stopping operations.`);
  }
};

/**
 * Executes the core trading logic.
 */
export const coreTradeExecution = async ({ data }: { data: Position[] }) => {
  const isTradeAlreadyTaken = Array.isArray(data) && data.length > 0;
  if (isTradeAlreadyTaken === false) {
    await shortStraddle(true);
    await notify('Short Straddle order executed successfully!');
  } else {
    const atmStrike = await getAtmStrikePrice();
    const previousTradeStrikePrice = getNearestStrike({
      algoTrades: data,
      atmStrike: atmStrike,
      expirationDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
    });
    await checkToRepeatShortStraddle(
      atmStrike,
      Number(previousTradeStrikePrice),
    );
  }
};

/**
 * Executes the main trading logic for the day.
 */
export const executeTrade = async () => {
  if (isPaperMode()) {
    await checkAndFillPaperOrders();
  }
  let resp: number | string = `${ALGO}: Trade Closed`;
  const isPastClosingTime = isCurrentTimeGreater({ hours: 15, minutes: 17 });

  const smartSession = await getSmartSession();
  const cred = getCredentials();
  const allPositions = await getPositions(smartSession, cred);
  const openSellPositions = getOpenSellPositions(allPositions);
  const mtmData = await getMtm(allPositions);

  if (isPastClosingTime === false) {
    await coreTradeExecution({ data: openSellPositions });
    await placeStopLossOnAllTrades(125, allPositions);
    resp = mtmData;
  }
  if (isPastClosingTime && openSellPositions.length > 0)
    await closeTrade(false);
  return resp;
};

/**
 * Checks if trading is allowed based on market conditions.
 */
export const isTradeAllowed = async (expiryDate: string) => {
  if (isKillSwitchActive()) {
    return { isAllowed: false, reasons: ['Kill switch engaged'] };
  }

  const isMarketOpen = !isMarketClosed();
  const isWeekend = moment().day() === 0 || moment().day() === 6;
  const isTuesday = moment().day() === 2;
  const isHoliday = isTradingHoliday();
  const isExpiryDay = moment().format('DDMMMYYYY').toUpperCase() === expiryDate;
  const hasTimePassed = isCurrentTimeGreater({ hours: 9, minutes: 15 });

  let isSmartAPIWorking = false;
  try {
    const smartData = await getSmartSession();
    isSmartAPIWorking = !isEmpty(smartData);
  } catch (err) {
    logger.error('Error in isTradeAllowed:', err);
  }

  const reasons: string[] = [];
  if (!isExpiryDay) reasons.push(`Not expiry day (${expiryDate})`);
  if (!isTuesday) reasons.push('Not Tuesday');
  if (isWeekend) reasons.push('Weekend');
  if (!isMarketOpen) reasons.push('Market closed');
  if (!hasTimePassed) reasons.push('Before 09:15 AM');
  if (!isSmartAPIWorking) reasons.push('Smart API down');
  if (isHoliday) reasons.push('Holiday');

  const isAllowed =
    isExpiryDay &&
    isTuesday &&
    !isWeekend &&
    isMarketOpen &&
    hasTimePassed &&
    isSmartAPIWorking &&
    !isHoliday;
  return { isAllowed, reasons };
};

/**
 * Checks market conditions and executes the trade if allowed.
 */
export const checkMarketConditionsAndExecuteTrade = async (
  lots: number = LOTS,
  lossPerLot: number = LOSSPERLOT,
) => {
  try {
    const expiryDate = await getNearestWeeklyExpiry('NIFTY');
    const indiaVix = await getIndexScrip({ scriptName: 'INDIA VIX' });
    const indiaVixLtp = await getLtpWithRetry({
      exchange: indiaVix[0].exch_seg,
      symboltoken: indiaVix[0].token,
      tradingsymbol: indiaVix[0].symbol,
    });

    OrderStore.getInstance().setPostData({
      QUANTITY: lots,
      EXPIRYDATE: expiryDate,
      INDEX: 'NIFTY',
      LOSSPERLOT: lossPerLot,
      INDIAVIX: indiaVixLtp.ltp,
    });

    const { isAllowed, reasons } = await isTradeAllowed(expiryDate);
    if (!isAllowed) {
      return `${MESSAGE_NOT_TAKE_TRADE}. Reasons: ${reasons.join(', ')}`;
    }
    return await executeTrade();
  } catch (err) {
    logger.error('Error in checkMarketConditionsAndExecuteTrade:', err);
    return err;
  }
};

/**
 * Checks market conditions without executing the trade.
 */
export const checkMarketConditions = async () => {
  const expiryDate = await getNearestWeeklyExpiry('NIFTY');
  const indiaVix = await getIndexScrip({ scriptName: 'INDIA VIX' });
  const indiaVixLtp = await getLtpWithRetry({
    exchange: indiaVix[0].exch_seg,
    symboltoken: indiaVix[0].token,
    tradingsymbol: indiaVix[0].symbol,
  });

  try {
    const { isAllowed, reasons } = await isTradeAllowed(expiryDate);
    return {
      conditions: {
        indiaVixLtp: indiaVixLtp.ltp,
        isAllowed,
        reasons,
        expiryDate,
      },
      message: isAllowed ? 'Favorable' : `Not favorable: ${reasons.join(', ')}`,
    };
  } catch (err) {
    return err;
  }
};

/**
 * Pure execution — places orders based on what it's told. No position checking.
 */
export const executeSellAtmBuyHedge = async ({
  index,
  expiry,
  atmStrike,
  isFirstTrade,
  sellLots = 1,
  buyLots = 3,
  hedgeDistance = 500,
}: {
  index: string;
  expiry: string;
  atmStrike: number;
  isFirstTrade: boolean;
  sellLots?: number;
  buyLots?: number;
  hedgeDistance?: number;
}) => {
  const ceHedgeStrike = atmStrike + hedgeDistance;
  const peHedgeStrike = atmStrike - hedgeDistance;

  // Fetch required scrips
  const scripPromises = [
    getScrip({
      scriptName: index,
      expiryDate: expiry,
      optionType: OptionType.CE,
      strikePrice: atmStrike.toString(),
    }),
    getScrip({
      scriptName: index,
      expiryDate: expiry,
      optionType: OptionType.PE,
      strikePrice: atmStrike.toString(),
    }),
    ...(isFirstTrade
      ? [
          getScrip({
            scriptName: index,
            expiryDate: expiry,
            optionType: OptionType.CE,
            strikePrice: ceHedgeStrike.toString(),
          }),
          getScrip({
            scriptName: index,
            expiryDate: expiry,
            optionType: OptionType.PE,
            strikePrice: peHedgeStrike.toString(),
          }),
        ]
      : []),
  ];

  const scripResults = await Promise.all(scripPromises);
  const atmCe = scripResults[0][0];
  const atmPe = scripResults[1][0];
  const lotSize = Number.parseInt(atmCe.lotsize);

  const { doOrder } = await import('./orders');
  const { TRANSACTION_TYPE_BUY, TRANSACTION_TYPE_SELL } = await import(
    '../constants'
  );

  const trades = [];
  if (isFirstTrade) {
    const hedgeCe = scripResults[2][0];
    const hedgePe = scripResults[3][0];

    const hedgeCeOrder = await doOrder({
      tradingsymbol: hedgeCe.symbol,
      symboltoken: hedgeCe.token,
      transactionType: TRANSACTION_TYPE_BUY,
      quantity: buyLots * lotSize,
      variety: 'NORMAL',
      ordertype: 'MARKET',
    });
    trades.push({
      action: 'BUY',
      type: 'HEDGE_CE',
      status: hedgeCeOrder.status,
    });

    const hedgePeOrder = await doOrder({
      tradingsymbol: hedgePe.symbol,
      symboltoken: hedgePe.token,
      transactionType: TRANSACTION_TYPE_BUY,
      quantity: buyLots * lotSize,
      variety: 'NORMAL',
      ordertype: 'MARKET',
    });
    trades.push({
      action: 'BUY',
      type: 'HEDGE_PE',
      status: hedgePeOrder.status,
    });
  }

  const atmCeOrder = await doOrder({
    tradingsymbol: atmCe.symbol,
    symboltoken: atmCe.token,
    transactionType: TRANSACTION_TYPE_SELL,
    quantity: sellLots * lotSize,
    variety: 'NORMAL',
    ordertype: 'MARKET',
  });
  trades.push({ action: 'SELL', type: 'ATM_CE', status: atmCeOrder.status });

  const atmPeOrder = await doOrder({
    tradingsymbol: atmPe.symbol,
    symboltoken: atmPe.token,
    transactionType: TRANSACTION_TYPE_SELL,
    quantity: sellLots * lotSize,
    variety: 'NORMAL',
    ordertype: 'MARKET',
  });

  trades.push({ action: 'SELL', type: 'ATM_PE', status: atmPeOrder.status });

  return { trades };
};
