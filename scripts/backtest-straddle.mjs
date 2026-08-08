#!/usr/bin/env node
/**
 * Short Straddle at ATM — NIFTY Option Chain Backtest
 * Replicates the LIVE algo's exact rules.
 *
 * Exits:
 *   1. 125% per-leg Stop Loss (trigger = entry * 2.25).
 *   2. Close (15:17+): sell legs with LTP > 5 bought back at market;
 *      sell legs with LTP <= 5 and ALL long hedges left to rot/expire.
 *
 * Entries:
 *   - Initial entry (>= 09:15): Buy 5-lot hedges at ATM+500 CE & ATM-500 PE, sell 1-lot ATM straddle.
 *   - Rolling entries: On subsequent ticks, if |ATM - nearestTradedSellStrike| >= strikeDiff (default 50, VIX < 14)
 *     and strike not traded, sell new ATM straddle (or missing leg if LTP > 5).
 *
 * Usage:
 *   node scripts/backtest-straddle.mjs
 *   node scripts/backtest-straddle.mjs --expiry-days-only --from 2026-02-01 --to 2026-08-03 --json out.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const DEFAULT_ENTRY = process.env.ENTRY_TIME
  ? process.env.ENTRY_TIME.replace(/[^0-9]/g, '').slice(0, 4)
  : '0915';

const DEFAULT_CLOSE = process.env.EXIT_TIME
  ? process.env.EXIT_TIME.replace(/[^0-9]/g, '').slice(0, 4)
  : '1517';

const DEFAULTS = {
  dataDir: null,
  from: null,
  to: null,
  entry: DEFAULT_ENTRY,
  close: DEFAULT_CLOSE,
  exit: DEFAULT_CLOSE, // alias / compat
  target: 0.5, // legacy flag ignored
  stop: 1.0, // legacy flag ignored
  strikeDiff: 50,
  vix: null,
  lotSize: 65,
  slSlippage: 0,
  entrySlippage: 0,
  expiries: 'nearest', // 'nearest' | 'all'
  expiryDaysOnly: false,
  json: null,
};

/* ------------------------------------------------------------------ */
/* Config helpers                                                      */
/* ------------------------------------------------------------------ */

function num(value, fallback) {
  if (value === true || value === null || value === undefined || value === '')
    return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function normalizeHHmm(value, fallback) {
  const digits = String(value).replace(/[^0-9]/g, '');
  if (digits.length < 4) return fallback;
  return digits.slice(0, 4);
}

function parseArgs(argv) {
  const config = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const camelKey = key.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    const eq = key.indexOf('=');
    if (eq >= 0) {
      config[camelKey] = key.slice(eq + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      config[camelKey] = argv[i + 1];
      i++;
    } else {
      config[camelKey] = true;
    }
  }

  config.target = num(config.target, DEFAULTS.target);
  config.stop = num(config.stop, DEFAULTS.stop);
  config.lotSize = num(config.lotSize, DEFAULTS.lotSize);
  config.strikeDiff = num(config.strikeDiff, DEFAULTS.strikeDiff);
  config.slSlippage = num(config.slSlippage, DEFAULTS.slSlippage);
  config.entrySlippage = num(config.entrySlippage, DEFAULTS.entrySlippage);
  config.entry = normalizeHHmm(config.entry, DEFAULTS.entry);

  const closeVal =
    config.close !== undefined && config.close !== DEFAULTS.close
      ? config.close
      : config.exit !== undefined && config.exit !== DEFAULTS.exit
        ? config.exit
        : DEFAULTS.close;
  config.close = normalizeHHmm(closeVal, DEFAULTS.close);
  config.exit = config.close;

  if (config.vix !== null && config.vix !== undefined) {
    const v = String(config.vix);
    if (v.startsWith('<14') || Number(v) < 14) {
      config.strikeDiff = 50;
    } else {
      config.strikeDiff = 100;
    }
  }

  config.expiries = config.expiries === 'all' ? 'all' : 'nearest';

  if (config.entry >= config.close) {
    console.error(
      `--entry (${config.entry}) must be earlier than --close (${config.close}).`,
    );
    process.exit(1);
  }

  return config;
}

function resolveDataDir(configured) {
  const candidates = [];
  if (configured) candidates.push(path.resolve(configured));
  if (process.env.OPTIONCHAIN_DATA_DIR)
    candidates.push(path.resolve(process.env.OPTIONCHAIN_DATA_DIR));
  candidates.push(
    path.join(ROOT_DIR, 'data', 'chains'),
    path.resolve(ROOT_DIR, '..', 'nifty-optionchain-data', 'data', 'chains'),
    path.resolve(
      ROOT_DIR,
      '..',
      '..',
      'nifty-optionchain-data',
      'data',
      'chains',
    ),
  );
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

function loadSnapshots(dataDir, { from = null, to = null } = {}) {
  const snapshots = [];
  const dateDirs = fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter(d => d.isDirectory());
  dateDirs.sort((a, b) => a.name.localeCompare(b.name));

  for (const dateDir of dateDirs) {
    const dateStr = dateDir.name;
    if (from && dateStr < from) continue;
    if (to && dateStr > to) continue;
    const dirPath = path.join(dataDir, dateStr);
    let files;
    try {
      files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    } catch {
      continue;
    }
    for (const file of files) {
      const match = /^(.+)_(\d{4})\.json$/.exec(file);
      if (!match) continue;
      const expiryDate = match[1];
      const timeHHmm = match[2];
      let snap;
      try {
        snap = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
      } catch (err) {
        console.error(
          `[warn] Skipping unreadable snapshot ${path.join(dirPath, file)}: ${err.message}`,
        );
        continue;
      }
      if (!Array.isArray(snap.rows) || snap.rows.length === 0) continue;

      snapshots.push({
        date: dateStr,
        expiry: expiryDate || snap.expiry_date,
        time: timeHHmm,
        snapshot_time: snap.snapshot_time || null,
        source: snap.source || 'unknown',
        index_close: Number(snap.index_close) || 0,
        rows: snap.rows,
      });
    }
  }
  return snapshots;
}

function groupByDateExpiry(snapshots) {
  const map = new Map();
  for (const snap of snapshots) {
    const key = `${snap.date}|${snap.expiry}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(snap);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.time.localeCompare(b.time));
  }
  return map;
}

function buildSessions(groups, expiriesMode) {
  const byDate = new Map();
  for (const [key, snaps] of groups) {
    const [date, expiry] = key.split('|');
    if (!byDate.has(date)) byDate.set(date, new Map());
    byDate.get(date).set(expiry, snaps);
  }

  const sessions = [];
  for (const [date, expiryMap] of byDate) {
    const expiries = [...expiryMap.keys()].sort();
    const targets =
      expiriesMode === 'all' ? expiries : pickNearestExpiry(expiries, date);
    for (const expiry of targets) {
      sessions.push({ date, expiry, snaps: expiryMap.get(expiry) });
    }
  }
  sessions.sort((a, b) =>
    `${a.date}|${a.expiry}`.localeCompare(`${b.date}|${b.expiry}`),
  );
  return sessions;
}

function pickNearestExpiry(expiries, dateStr) {
  const eligible = expiries.filter(e => e >= dateStr);
  return [eligible.length ? eligible[0] : expiries[0]];
}

function expiryToDateStr(expiry) {
  const str = String(expiry || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(str);
  if (!m) return null;
  const months = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12',
  };
  const mm = months[m[2]];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1]}`;
}

/* ------------------------------------------------------------------ */
/* Strategy primitives                                                 */
/* ------------------------------------------------------------------ */

export function findAtmStrike(rows, spot) {
  if (
    !Number.isFinite(spot) ||
    spot <= 0 ||
    !Array.isArray(rows) ||
    rows.length === 0
  )
    return null;
  let best = null;
  let bestDiff = Infinity;
  for (const row of rows) {
    const strike = Number(row.strike_price);
    if (!Number.isFinite(strike)) continue;
    const diff = Math.abs(strike - spot);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = row;
    }
  }
  return best;
}

export function getNearestTradedSellStrike(openPositions, atmStrike) {
  const sellStrikes = [
    ...new Set(
      openPositions.filter(p => p.type === 'SELL').map(p => Number(p.strike)),
    ),
  ];
  if (sellStrikes.length === 0) return null;

  let nearest = sellStrikes[0];
  let minDiff = Math.abs(nearest - atmStrike);
  for (let i = 1; i < sellStrikes.length; i++) {
    const diff = Math.abs(sellStrikes[i] - atmStrike);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = sellStrikes[i];
    }
  }
  return nearest;
}

export function getOptionLtp(snap, strike, optionType) {
  const row = snap.rows.find(r => Number(r.strike_price) === strike);
  if (!row) return null;
  const val =
    optionType === 'CE' ? Number(row.calls_ltp) : Number(row.puts_ltp);
  return Number.isFinite(val) && val > 0 ? val : null;
}

/* ------------------------------------------------------------------ */
/* Session simulation                                                  */
/* ------------------------------------------------------------------ */

export function simulateSession(snaps, options) {
  const entryTime = options.entryTime || '0915';
  const closeTime = options.closeTime || options.exitTime || '1517';
  const strikeDiff = options.strikeDiff !== undefined ? options.strikeDiff : 50;
  const slSlippage = options.slSlippage || 0;
  const entrySlippage = options.entrySlippage || 0;

  const entrySnapIndex = snaps.findIndex(s => s.time >= entryTime);
  if (entrySnapIndex === -1) {
    return { skipped: true, reason: 'NO_ENTRY_SNAPSHOT' };
  }

  const positions = [];
  const mtm = [];
  let nextPosId = 1;

  function addPosition(pos) {
    const id = nextPosId++;
    const fullPos = { id, status: 'OPEN', ...pos };
    positions.push(fullPos);
    return fullPos;
  }

  // First entry snapshot
  const firstSnap = snaps[entrySnapIndex];
  const atmRow = findAtmStrike(firstSnap.rows, firstSnap.index_close);
  if (!atmRow) {
    return {
      skipped: true,
      reason: 'NO_VALID_ATM_PREMIUM',
      date: snaps[0].date,
      expiry: snaps[0].expiry,
    };
  }

  const atmStrike = Number(atmRow.strike_price);

  // Buy Hedges (5 lots each at ATM + 500 CE & ATM - 500 PE)
  const ceHedgeStrike = atmStrike + 500;
  const peHedgeStrike = atmStrike - 500;

  const ceHedgeLtp = getOptionLtp(firstSnap, ceHedgeStrike, 'CE');
  if (ceHedgeLtp !== null) {
    addPosition({
      strike: ceHedgeStrike,
      optionType: 'CE',
      type: 'BUY',
      quantityLots: 5,
      entryPrice: round2(ceHedgeLtp + entrySlippage),
      entryTime: firstSnap.time,
    });
  } else {
    console.warn(
      `[warn] hedge strike missing: ${firstSnap.date} CE ${ceHedgeStrike}`,
    );
  }

  const peHedgeLtp = getOptionLtp(firstSnap, peHedgeStrike, 'PE');
  if (peHedgeLtp !== null) {
    addPosition({
      strike: peHedgeStrike,
      optionType: 'PE',
      type: 'BUY',
      quantityLots: 5,
      entryPrice: round2(peHedgeLtp + entrySlippage),
      entryTime: firstSnap.time,
    });
  } else {
    console.warn(
      `[warn] hedge strike missing: ${firstSnap.date} PE ${peHedgeStrike}`,
    );
  }

  // Sell Initial ATM Straddle (1 lot each)
  const ceSellLtp = getOptionLtp(firstSnap, atmStrike, 'CE');
  const peSellLtp = getOptionLtp(firstSnap, atmStrike, 'PE');

  if (ceSellLtp === null || peSellLtp === null) {
    return {
      skipped: true,
      reason: 'NO_VALID_ATM_PREMIUM',
      date: snaps[0].date,
      expiry: snaps[0].expiry,
    };
  }

  const ceSellEntry = round2(Math.max(0.05, ceSellLtp - entrySlippage));
  addPosition({
    strike: atmStrike,
    optionType: 'CE',
    type: 'SELL',
    quantityLots: 1,
    entryPrice: ceSellEntry,
    entryTime: firstSnap.time,
    slTriggerPrice: round2(ceSellEntry * 2.25),
    slLimitPrice: round2(ceSellEntry * 2.25 * 1.05),
  });

  const peSellEntry = round2(Math.max(0.05, peSellLtp - entrySlippage));
  addPosition({
    strike: atmStrike,
    optionType: 'PE',
    type: 'SELL',
    quantityLots: 1,
    entryPrice: peSellEntry,
    entryTime: firstSnap.time,
    slTriggerPrice: round2(peSellEntry * 2.25),
    slLimitPrice: round2(peSellEntry * 2.25 * 1.05),
  });

  // Track session execution snap-by-snap
  for (let i = entrySnapIndex; i < snaps.length; i++) {
    const snap = snaps[i];

    // 1. Check Stop Loss for all OPEN SELL positions
    for (const pos of positions) {
      if (pos.status !== 'OPEN' || pos.type !== 'SELL') continue;
      const currentLtp = getOptionLtp(snap, pos.strike, pos.optionType);
      if (currentLtp !== null && currentLtp >= pos.slTriggerPrice) {
        pos.status = 'CLOSED';
        pos.exitPrice = round2(
          Math.max(pos.slLimitPrice, currentLtp) + slSlippage,
        );
        pos.exitTime = snap.time;
        pos.exitReason = 'SL_TRIGGERED';
      }
    }

    // 2. Check Phase A close time reached (>= closeTime, ~15:17)
    if (snap.time >= closeTime) {
      for (const pos of positions) {
        if (pos.status !== 'OPEN' || pos.type !== 'SELL') continue;
        const ltp = getOptionLtp(snap, pos.strike, pos.optionType) || 0;
        if (ltp > 5) {
          pos.status = 'CLOSED';
          pos.exitPrice = round2(ltp);
          pos.exitTime = snap.time;
          pos.exitReason = 'CLOSED_LTP_GT_5';
        }
      }
      mtm.push({
        time: snap.time,
        spot: snap.index_close,
        openPositionsCount: positions.filter(p => p.status === 'OPEN').length,
      });
      break; // Stop market loop; Phase B will settle remaining open positions at final snapshot LTP
    }

    // 3. Rolling / Repeat Short Straddle logic
    const currentAtmRow = findAtmStrike(snap.rows, snap.index_close);
    if (currentAtmRow) {
      const currentAtmStrike = Number(currentAtmRow.strike_price);
      const prevStrike = getNearestTradedSellStrike(
        positions,
        currentAtmStrike,
      );

      if (prevStrike !== null) {
        const diff = currentAtmStrike - prevStrike;
        const tradedStrikes = new Set(
          positions.filter(p => p.type === 'SELL').map(p => p.strike),
        );
        const isAlreadyTraded = tradedStrikes.has(currentAtmStrike);

        if (Math.abs(diff) >= strikeDiff && !isAlreadyTraded) {
          // Sell both legs (or missing leg if LTP > 5)
          const cePresent = positions.some(
            p =>
              p.strike === currentAtmStrike &&
              p.optionType === 'CE' &&
              p.type === 'SELL',
          );
          const pePresent = positions.some(
            p =>
              p.strike === currentAtmStrike &&
              p.optionType === 'PE' &&
              p.type === 'SELL',
          );

          if (!cePresent) {
            const ltp = getOptionLtp(snap, currentAtmStrike, 'CE');
            if (ltp !== null && (!pePresent || ltp > 5)) {
              const entryPrice = round2(Math.max(0.05, ltp - entrySlippage));
              addPosition({
                strike: currentAtmStrike,
                optionType: 'CE',
                type: 'SELL',
                quantityLots: 1,
                entryPrice,
                entryTime: snap.time,
                slTriggerPrice: round2(entryPrice * 2.25),
                slLimitPrice: round2(entryPrice * 2.25 * 1.05),
              });
            }
          }

          if (!pePresent) {
            const ltp = getOptionLtp(snap, currentAtmStrike, 'PE');
            if (ltp !== null && (!cePresent || ltp > 5)) {
              const entryPrice = round2(Math.max(0.05, ltp - entrySlippage));
              addPosition({
                strike: currentAtmStrike,
                optionType: 'PE',
                type: 'SELL',
                quantityLots: 1,
                entryPrice,
                entryTime: snap.time,
                slTriggerPrice: round2(entryPrice * 2.25),
                slLimitPrice: round2(entryPrice * 2.25 * 1.05),
              });
            }
          }
        } else if (diff === 0 && isAlreadyTraded) {
          // Fill missing leg if LTP > 5
          const cePresent = positions.some(
            p =>
              p.strike === currentAtmStrike &&
              p.optionType === 'CE' &&
              p.type === 'SELL' &&
              p.status === 'OPEN',
          );
          const pePresent = positions.some(
            p =>
              p.strike === currentAtmStrike &&
              p.optionType === 'PE' &&
              p.type === 'SELL' &&
              p.status === 'OPEN',
          );

          if (!cePresent && pePresent) {
            const ltp = getOptionLtp(snap, currentAtmStrike, 'CE');
            if (ltp !== null && ltp > 5) {
              const entryPrice = round2(Math.max(0.05, ltp - entrySlippage));
              addPosition({
                strike: currentAtmStrike,
                optionType: 'CE',
                type: 'SELL',
                quantityLots: 1,
                entryPrice,
                entryTime: snap.time,
                slTriggerPrice: round2(entryPrice * 2.25),
                slLimitPrice: round2(entryPrice * 2.25 * 1.05),
              });
            }
          } else if (!pePresent && cePresent) {
            const ltp = getOptionLtp(snap, currentAtmStrike, 'PE');
            if (ltp !== null && ltp > 5) {
              const entryPrice = round2(Math.max(0.05, ltp - entrySlippage));
              addPosition({
                strike: currentAtmStrike,
                optionType: 'PE',
                type: 'SELL',
                quantityLots: 1,
                entryPrice,
                entryTime: snap.time,
                slTriggerPrice: round2(entryPrice * 2.25),
                slLimitPrice: round2(entryPrice * 2.25 * 1.05),
              });
            }
          }
        }
      }
    }

    mtm.push({
      time: snap.time,
      spot: snap.index_close,
      openPositionsCount: positions.filter(p => p.status === 'OPEN').length,
    });
  }

  // Phase B: Settle any remaining OPEN positions using the LAST available snapshot of the day (~15:30)
  const finalSnap = snaps[snaps.length - 1];
  const finalSnapTime = finalSnap.time;

  for (const pos of positions) {
    if (pos.status === 'OPEN') {
      let finalLtp = getOptionLtp(finalSnap, pos.strike, pos.optionType);

      // Fallback: search backwards for previous snapshot LTP if missing from final snap
      if (finalLtp === null) {
        for (let j = snaps.length - 2; j >= 0; j--) {
          const ltp = getOptionLtp(snaps[j], pos.strike, pos.optionType);
          if (ltp !== null) {
            finalLtp = ltp;
            break;
          }
        }
      }

      if (finalLtp === null) {
        finalLtp = 0;
        console.warn(
          `[warn] final snapshot LTP missing: ${finalSnap.date} ${pos.optionType} ${pos.strike}`,
        );
      }

      finalLtp = round2(finalLtp);

      if (pos.type === 'SELL') {
        pos.status = 'CLOSED';
        pos.exitPrice = finalLtp;
        pos.exitTime = finalSnapTime;
        pos.exitReason = finalLtp > 5 ? 'SETTLED_ITM' : 'EXPIRED_WORTHLESS';
      } else if (pos.type === 'BUY') {
        pos.status = 'CLOSED';
        pos.exitPrice = finalLtp;
        pos.exitTime = finalSnapTime;
        pos.exitReason = 'HEDGE_SETTLED';
      }
    }
  }

  // Calculate per-position and total P&L in points
  let totalPnlPoints = 0;
  for (const pos of positions) {
    if (pos.type === 'SELL') {
      pos.pnlPoints = (pos.entryPrice - pos.exitPrice) * pos.quantityLots;
    } else {
      // BUY hedges
      pos.pnlPoints = (pos.exitPrice - pos.entryPrice) * pos.quantityLots;
    }
    totalPnlPoints += pos.pnlPoints;
  }

  const tradedSellStrikes = [
    ...new Set(positions.filter(p => p.type === 'SELL').map(p => p.strike)),
  ];

  return {
    skipped: false,
    date: snaps[0].date,
    expiry: snaps[0].expiry,
    source: firstSnap.source,
    entryTime: firstSnap.time,
    exitTime: positions.length
      ? positions[positions.length - 1].exitTime
      : firstSnap.time,
    atmStrike,
    tradedSellStrikes,
    positions,
    pnlUnit: totalPnlPoints,
    mtm,
  };
}

/* ------------------------------------------------------------------ */
/* Reporting                                                           */
/* ------------------------------------------------------------------ */

function fmtMoney(value) {
  return `${value >= 0 ? '+' : '-'}₹${Math.abs(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function computeSummary(rows, lotSize) {
  const total = rows.reduce((sum, r) => sum + r.pnl, 0);
  const wins = rows.filter(r => r.pnl > 0);
  const losses = rows.filter(r => r.pnl < 0);
  const grossProfit = wins.reduce((sum, r) => sum + r.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, r) => sum + r.pnl, 0));
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  let peak = 0;
  let maxDrawdown = 0;
  let cum = 0;
  for (const r of rows) {
    cum += r.pnl;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const totalLots = rows.reduce((sum, r) => {
    const sessionLots = r.positions.reduce(
      (pSum, p) => pSum + p.quantityLots,
      0,
    );
    return sum + sessionLots * lotSize;
  }, 0);

  return {
    sessions: rows.length,
    total,
    wins: wins.length,
    losses: losses.length,
    winRate: rows.length ? (wins.length / rows.length) * 100 : 0,
    avg: rows.length ? total / rows.length : 0,
    best: rows.length ? Math.max(...rows.map(r => r.pnl)) : 0,
    worst: rows.length ? Math.min(...rows.map(r => r.pnl)) : 0,
    grossProfit,
    grossLoss,
    profitFactor,
    maxDrawdown,
    totalLots,
  };
}

function printReport(sessions, config) {
  const valid = sessions
    .filter(s => !s.skipped)
    .map(s => ({ ...s, pnl: s.pnlUnit * config.lotSize }));
  const skipped = sessions.filter(s => s.skipped);
  const summary = computeSummary(valid, config.lotSize);

  console.log('='.repeat(78));
  console.log(
    ' SHORT STRADDLE AT ATM — NIFTY OPTION CHAIN BACKTEST (LIVE FIDELITY)',
  );
  console.log('='.repeat(78));
  console.log(`Data dir   : ${config.dataDir}`);
  console.log(
    `Range      : ${config.from || 'all'} → ${config.to || 'all'}  (${valid.length} sessions, ${skipped.length} skipped)`,
  );
  console.log(
    `Strategy   : entry ${config.entry.slice(0, 2)}:${config.entry.slice(2)}  close ${config.close.slice(0, 2)}:${config.close.slice(2)}  strikeDiff ${config.strikeDiff}  expiries ${config.expiries}  expiryDaysOnly ${config.expiryDaysOnly ? 'ON' : 'OFF'}`,
  );
  console.log(`Lot size   : ${config.lotSize}`);
  console.log('-'.repeat(78));
  console.log(
    ' Date       Expiry     ATM strike  Traded Strikes      Positions  P&L (₹)',
  );
  console.log('-'.repeat(78));

  for (const r of valid) {
    const strikesStr = (r.tradedSellStrikes || [r.atmStrike]).join(',');
    console.log(
      ` ${r.date}  ${r.expiry}  ${String(r.atmStrike).padStart(9)}  ${strikesStr.padEnd(18)}  ${String(r.positions.length).padStart(9)}  ${fmtMoney(r.pnl).padStart(13)}`,
    );
  }

  if (skipped.length) {
    console.log('-'.repeat(78));
    for (const s of skipped) {
      console.log(` [skipped] ${s.date || ''} ${s.expiry || ''} — ${s.reason}`);
    }
  }

  console.log('-'.repeat(78));
  console.log(' SUMMARY');
  console.log('-'.repeat(78));
  console.log(`Sessions       : ${summary.sessions}`);
  console.log(
    `Wins / Losses  : ${summary.wins} / ${summary.losses}  (win rate ${summary.winRate.toFixed(2)}%)`,
  );
  console.log(`Total P&L      : ${fmtMoney(summary.total)}`);
  console.log(`Avg P&L/session: ${fmtMoney(summary.avg)}`);
  console.log(
    `Best / Worst   : ${fmtMoney(summary.best)} / ${fmtMoney(summary.worst)}`,
  );
  console.log(`Gross Profit   : ${fmtMoney(summary.grossProfit)}`);
  console.log(`Gross Loss     : ${fmtMoney(-summary.grossLoss)}`);
  console.log(
    `Profit Factor  : ${Number.isFinite(summary.profitFactor) ? summary.profitFactor.toFixed(2) : '∞'}`,
  );
  console.log(`Max Drawdown   : ${fmtMoney(-summary.maxDrawdown)}`);
  console.log(
    `Lots Traded    : ${summary.totalLots} (${valid.length} sessions)`,
  );
  console.log('='.repeat(78));
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  const config = parseArgs(process.argv.slice(2));
  const dataDir = resolveDataDir(config.dataDir);
  if (!dataDir) {
    console.error(
      'Could not locate option-chain data. Pass --data-dir <path> or set OPTIONCHAIN_DATA_DIR ' +
        'to the "data/chains" directory of the nifty-optionchain-data repo.',
    );
    process.exit(1);
  }
  config.dataDir = dataDir;

  let snapshots = loadSnapshots(dataDir, {
    from: config.from,
    to: config.to,
  });
  if (snapshots.length === 0) {
    console.error(
      `No snapshots found under ${dataDir}${config.from ? ` for range ${config.from} → ${config.to}` : ''}.`,
    );
    process.exit(1);
  }

  const groups = groupByDateExpiry(snapshots);
  let sessions = buildSessions(groups, config.expiries);
  if (config.expiryDaysOnly) {
    sessions = sessions.filter(s => {
      const expiryDate = expiryToDateStr(s.expiry);
      if (!expiryDate || expiryDate !== s.date) return false;
      const dow = new Date(s.date + 'T00:00:00').getDay();
      return dow === 2;
    });
    console.log(
      `[backtest] --expiry-days-only: keeping only expiry Tuesdays (${sessions.length} sessions)`,
    );
  }

  const results = sessions.map(session =>
    simulateSession(session.snaps, {
      entryTime: config.entry,
      closeTime: config.close,
      exitTime: config.exit,
      strikeDiff: config.strikeDiff,
    }),
  );

  printReport(results, config);

  if (config.json) {
    const output = {
      config,
      summary: computeSummary(
        results
          .filter(s => !s.skipped)
          .map(s => ({ ...s, pnl: s.pnlUnit * config.lotSize })),
        config.lotSize,
      ),
      sessions: results,
    };
    const filePath = path.resolve(config.json);
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    console.log(`\nDetailed results written to ${filePath}`);
  }
}

main();
