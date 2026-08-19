import { config as appConfig } from '../../config/env';
import moment from 'moment-timezone';
import { isEmpty } from 'lodash';
import {
  DELAY,
  delay,
  isCurrentTimeGreater,
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
  hasHedgePositions,
  getAlgoIndex,
  isTradingHoliday,
  getIndiaVixLtp,
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
  pruneStalePositions,
} from './positions';
import { checkAndFillPaperOrders, isPaperMode } from '../paperTrade';

import {
  getSessionState,
  setStraddleOpenedToday,
  setMtmBaseline,
} from '../../store/sessionStore';

/**
 * Creates a short straddle position.
 */
export const shortStraddle = async (isBuyHedge = false) => {
  try {
    const atmStrike = await getAtmStrikePrice();
    const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
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
    if (isBuyHedge) {
      setStraddleOpenedToday(expiryDate);
    }
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
    const noEntryTime = getAlgoNoEntryTime();
    if (isCurrentTimeGreater(noEntryTime)) {
      const formattedCutoff = `${String(noEntryTime.hours).padStart(2, '0')}:${String(noEntryTime.minutes).padStart(2, '0')}`;
      logger.log(
        `${ALGO}: Skipping roll: past entry cutoff (${formattedCutoff})`,
      );
      return;
    }
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
export const coreTradeExecution = async ({
  data,
  allPositions,
}: {
  data: Position[];
  allPositions: Position[];
}) => {
  const isTradeAlreadyTaken = Array.isArray(data) && data.length > 0;
  const hedgesExist = hasHedgePositions(allPositions);
  const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  const sessionState = getSessionState(expiryDate);

  if (isTradeAlreadyTaken === false || hedgesExist === false) {
    if (sessionState.straddleOpenedToday) {
      logger.log(
        `${ALGO}: Straddle already opened once in this session. Skipping shortStraddle.`,
      );
      return;
    }
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

export const getAlgoEntryTime = (): { hours: number; minutes: number } => {
  const [hoursStr, minutesStr] = (appConfig.entryTime || '09:15').split(':');
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);
  return {
    hours: Number.isFinite(hours) ? hours : 9,
    minutes: Number.isFinite(minutes) ? minutes : 15,
  };
};

export const getAlgoExitTime = (): { hours: number; minutes: number } => {
  const [hoursStr, minutesStr] = (appConfig.exitTime || '15:17').split(':');
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);
  return {
    hours: Number.isFinite(hours) ? hours : 15,
    minutes: Number.isFinite(minutes) ? minutes : 17,
  };
};

export const getAlgoNoEntryTime = (): { hours: number; minutes: number } => {
  const [hoursStr, minutesStr] = (appConfig.noEntryAfter || '15:10').split(':');
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);
  return {
    hours: Number.isFinite(hours) ? hours : 15,
    minutes: Number.isFinite(minutes) ? minutes : 10,
  };
};

/**
 * Executes the main trading logic for the day.
 */
export const executeTrade = async () => {
  if (isPaperMode()) {
    await checkAndFillPaperOrders();
  }
  let resp: number | string = `${ALGO}: Trade Closed`;
  const { hours, minutes } = getAlgoExitTime();
  const isPastClosingTime = isCurrentTimeGreater({ hours, minutes });

  const smartSession = await getSmartSession();
  const cred = getCredentials();
  const allPositions = await getPositions(smartSession, cred);
  const openSellPositions = getOpenSellPositions(allPositions);
  const mtmData = await getMtm(allPositions);

  const orderStore = OrderStore.getInstance();
  const postData = orderStore.getPostData();
  const sessionState = getSessionState(postData.EXPIRYDATE);

  if (sessionState.mtmBaseline === 0) {
    setMtmBaseline(postData.EXPIRYDATE, mtmData);
    postData.MTM_BASELINE = mtmData;
    orderStore.setPostData(postData);
  } else {
    postData.MTM_BASELINE = sessionState.mtmBaseline;
    orderStore.setPostData(postData);
  }

  const adjustedMtm = mtmData - postData.MTM_BASELINE;

  if (isPastClosingTime === false) {
    if (isCurrentTimeGreater(getAlgoNoEntryTime()) === false) {
      await coreTradeExecution({ data: openSellPositions, allPositions });
    }
    const freshPositions = await getPositions(smartSession, cred);
    await placeStopLossOnAllTrades(125, freshPositions);
    resp = adjustedMtm;
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

  const entryTimeObj = getAlgoEntryTime();
  const isMarketOpen = !isMarketClosed();
  const isWeekend = moment().day() === 0 || moment().day() === 6;
  const isHoliday = await isTradingHoliday();
  const isExpiryDay = moment().format('DDMMMYYYY').toUpperCase() === expiryDate;
  const hasTimePassed = isCurrentTimeGreater({
    hours: entryTimeObj.hours,
    minutes: entryTimeObj.minutes,
  });

  let isSmartAPIWorking = false;
  try {
    const smartData = await getSmartSession();
    isSmartAPIWorking = !isEmpty(smartData);
  } catch (err) {
    logger.error('Error in isTradeAllowed:', err);
  }

  const formattedEntryTime = `${String(entryTimeObj.hours).padStart(2, '0')}:${String(entryTimeObj.minutes).padStart(2, '0')}`;

  const reasons: string[] = [];
  if (!isExpiryDay) reasons.push(`Not expiry day (${expiryDate})`);
  if (isWeekend) reasons.push('Weekend');
  if (!isMarketOpen) reasons.push('Market closed');
  if (!hasTimePassed) reasons.push(`Before ${formattedEntryTime}`);
  if (!isSmartAPIWorking) reasons.push('Smart API down');
  if (isHoliday) reasons.push('Holiday');

  const isAllowed =
    isExpiryDay &&
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
    const index = getAlgoIndex();
    const expiryDate = await getNearestWeeklyExpiry(
      index as 'NIFTY' | 'SENSEX',
    );
    pruneStalePositions(expiryDate);
    const indiaVixLtp = await getIndiaVixLtp();
    const vixVal = indiaVixLtp !== null ? indiaVixLtp : 0;

    const currentPostData = OrderStore.getInstance().getPostData();
    OrderStore.getInstance().setPostData({
      QUANTITY: lots,
      EXPIRYDATE: expiryDate,
      INDEX: index,
      LOSSPERLOT: lossPerLot,
      INDIAVIX: vixVal,
      MTM_BASELINE: currentPostData ? currentPostData.MTM_BASELINE : 0,
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
  const index = getAlgoIndex();
  const expiryDate = await getNearestWeeklyExpiry(index as 'NIFTY' | 'SENSEX');
  const indiaVixLtp = await getIndiaVixLtp();
  const vixVal = indiaVixLtp !== null ? indiaVixLtp : 0;

  try {
    const { isAllowed, reasons } = await isTradeAllowed(expiryDate);
    return {
      conditions: {
        indiaVixLtp: vixVal,
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
