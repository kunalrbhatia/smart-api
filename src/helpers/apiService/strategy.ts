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
} from './marketData';
import { doOrderByStrike } from './orders';
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
  setStoplossFiredToday,
  setMtmBaseline,
} from '../../store/sessionStore';
import { closeBreachedLegs } from './positions';

const STOPLOSS_PERCENT = 125; // 125% over entry → exit at ~2.25× entry premium (matches old SL)

export interface StoplossBreach {
  symbol: string; // tradingsymbol of the breached leg
  reason: 'LTP' | 'MTM';
  ltp?: number;
  trigger?: number;
}

export const shouldExitDueToStoploss = (
  positions: Position[] = [],
  adjustedMtm: number,
  _lossPerLot: number = LOSSPERLOT,
): { shouldExit: boolean; reasons: string[]; breaches: StoplossBreach[] } => {
  const reasons: string[] = [];
  const breaches: StoplossBreach[] = [];
  const safePositions = Array.isArray(positions) ? positions : [];

  // Signal 1: per-leg LTP breach (mirror of old broker SL: entry × (1 + STOPLOSS_PERCENT/100))
  for (const pos of safePositions) {
    const netQty = Number.parseInt(pos.netqty, 10);
    if (netQty >= 0) continue; // only short legs
    const entryPrice = Math.abs(Number.parseFloat(pos.netvalue) / netQty);
    const trigger = entryPrice * (1 + STOPLOSS_PERCENT / 100);
    const ltp = Number.parseFloat(pos.ltp);
    // Zero/invalid entry price or LTP (stale row, manual sync, missing refresh)
    // must NEVER trigger an exit — 0 >= 0 is a false positive.
    if (
      Number.isFinite(ltp) &&
      ltp > 0 &&
      Number.isFinite(entryPrice) &&
      entryPrice > 0 &&
      ltp >= trigger
    ) {
      reasons.push(
        `${pos.tradingsymbol}: LTP ${ltp.toFixed(2)} >= trigger ${trigger.toFixed(2)}`,
      );
      breaches.push({
        symbol: pos.tradingsymbol,
        reason: 'LTP',
        ltp,
        trigger,
      });
    }
  }

  // Signal 2 removed by user request (1-Sep-2026): the whole-position MTM condition
  // (adjustedMtm <= -LOSSPERLOT) no longer triggers exits. Only per-leg LTP breaches
  // (Signal 1) fire the stop — legs close only when their own premium doubles-ish.
  // NOTE: this is a live hotfix pending formalization into a PR (PR #104 pattern).
  return {
    shouldExit: breaches.length > 0 || reasons.length > 0,
    reasons,
    breaches,
  };
};

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
      // Hedge walk step: NIFTY strikes are 50 apart, SENSEX are 100 apart.
      // If the far hedge's LTP is > 3 (too expensive), walk further OTM in
      // strike increments to find a cheaper hedge (3-Sep hotfix: SENSEX had
      // strikeVariance 0 → infinite retry on the same strike → no entry).
      const strikeVariance = index === INDICES.NIFTY ? 50 : 100;
      const MAX_HEDGE_ATTEMPTS = 5; // proceed without the hedge after 5 tries
      let strikeIncrement = strikeVariance;
      let hedgeAttempts = 0;

      let ceHedge = await doOrderByStrike(
        atmStrike + hedgeVariance,
        OptionType.CE,
        'BUY',
        true,
      );
      while (
        typeof ceHedge === 'boolean' &&
        ceHedge === false &&
        hedgeAttempts < MAX_HEDGE_ATTEMPTS
      ) {
        hedgeAttempts++;
        logger.log(
          `${ALGO}: CE hedge attempt ${hedgeAttempts}/${MAX_HEDGE_ATTEMPTS} — walking to ${atmStrike + hedgeVariance + strikeIncrement}`,
        );
        ceHedge = await doOrderByStrike(
          atmStrike + hedgeVariance + strikeIncrement,
          OptionType.CE,
          'BUY',
          true,
        );
        strikeIncrement += strikeVariance;
      }
      if (typeof ceHedge === 'boolean' && ceHedge === false) {
        logger.log(
          `${ALGO}: CE hedge not placed after ${MAX_HEDGE_ATTEMPTS} attempts — proceeding without CE hedge`,
        );
      }

      hedgeAttempts = 0;
      strikeIncrement = strikeVariance;
      let peHedge = await doOrderByStrike(
        atmStrike - hedgeVariance,
        OptionType.PE,
        'BUY',
        true,
      );
      while (
        typeof peHedge === 'boolean' &&
        peHedge === false &&
        hedgeAttempts < MAX_HEDGE_ATTEMPTS
      ) {
        hedgeAttempts++;
        logger.log(
          `${ALGO}: PE hedge attempt ${hedgeAttempts}/${MAX_HEDGE_ATTEMPTS} — walking to ${atmStrike - hedgeVariance - strikeIncrement}`,
        );
        peHedge = await doOrderByStrike(
          atmStrike - hedgeVariance - strikeIncrement,
          OptionType.PE,
          'BUY',
          true,
        );
        strikeIncrement += strikeVariance;
      }
      if (typeof peHedge === 'boolean' && peHedge === false) {
        logger.log(
          `${ALGO}: PE hedge not placed after ${MAX_HEDGE_ATTEMPTS} attempts — proceeding without PE hedge`,
        );
      }
    }
    const ceSell = await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
    const peSell = await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
    if (isBuyHedge) {
      // Only mark the session as opened if BOTH sell legs actually filled.
      // (doOrderByStrike returns { status: false } on a rejected order — e.g.
      // AB4046 exchange mismatch — and setting the flag anyway made the next
      // tick skip the entry while positions.json was empty.)
      const ceSellFilled =
        typeof ceSell === 'object' && ceSell !== null && ceSell.status === true;
      const peSellFilled =
        typeof peSell === 'object' && peSell !== null && peSell.status === true;
      if (ceSellFilled && peSellFilled) {
        setStraddleOpenedToday(expiryDate);
      } else {
        logger.log(
          `${ALGO}: Straddle SELL legs incomplete (CE: ${ceSellFilled}, PE: ${peSellFilled}) — not marking session as opened. Will retry on next tick.`,
        );
      }
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
  previousTradeStrikePrice?: number,
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

    // Guard against zero / unparseable strikeprice in open sell positions
    const invalidStrikePos = (positions || []).find(
      p =>
        !p.strikeprice ||
        p.strikeprice === '0' ||
        Number.isNaN(Number(p.strikeprice)),
    );
    if (invalidStrikePos) {
      logger.warn(
        `${ALGO}: Data integrity warning — found position with invalid strikeprice '${invalidStrikePos.strikeprice}' (${invalidStrikePos.tradingsymbol}). Skipping roll decision.`,
      );
      return;
    }

    if (
      !previousTradeStrikePrice ||
      previousTradeStrikePrice === 0 ||
      Number.isNaN(previousTradeStrikePrice)
    ) {
      logger.warn(
        `${ALGO}: Data integrity warning — previousTradeStrikePrice is ${previousTradeStrikePrice}. Skipping roll decision.`,
      );
      return;
    }

    const isSameStrikeAlreadyTraded = checkStrike(
      positions,
      atmStrike.toString(),
    );
    const result = areBothOptionTypesPresentForStrike(
      positions,
      atmStrike.toString(),
    );
    const cepe_present = checkBoth_CE_PE_Present(result);

    logger.log(
      `${ALGO}: Roll decision inputs — difference: ${difference}, strikeDiff: ${strikeDiff}, isSameStrikeAlreadyTraded: ${isSameStrikeAlreadyTraded}, cepe_present: ${cepe_present}, previousTradeStrikePrice: ${previousTradeStrikePrice}, atmStrike: ${atmStrike}`,
    );

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
    await repeatShortStraddle(difference, atmStrike, previousTradeStrikePrice);
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

  if (sessionState.stoplossFiredToday) {
    logger.log(`${ALGO}: Skipping entry/roll: stoploss fired earlier today`);
    return;
  }

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
    const { shouldExit, reasons, breaches } = shouldExitDueToStoploss(
      freshPositions,
      adjustedMtm,
    );
    if (shouldExit) {
      logger.log(
        `${ALGO}: Tick-based stoploss triggered — ${reasons.join('; ')}`,
      );
      await notify(`⚠️ Stoploss triggered: ${reasons.join('; ')}`);
      const closed = await closeBreachedLegs(breaches);
      logger.log(
        `${ALGO}: Closed ${closed} breached leg(s); remaining position continues`,
      );
      await setStoplossFiredToday(
        OrderStore.getInstance().getPostData().EXPIRYDATE,
        true,
      );
    }
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

    const { hours, minutes } = getAlgoExitTime();
    const isPastClosingTime = isCurrentTimeGreater({ hours, minutes });
    if (isPastClosingTime) {
      // Past exit time: execute close trade regardless of entry trade permissions
      return await executeTrade();
    }

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
