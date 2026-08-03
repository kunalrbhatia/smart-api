#!/usr/bin/env node
/**
 * Short Straddle at ATM — NIFTY Option Chain Backtest
 *
 * Reads unified option-chain snapshots produced by the
 * `nifty-optionchain-data` pipeline (`data/chains/YYYY-MM-DD/EXPIRY_HHmm.json`)
 * and backtests an intraday short straddle strategy:
 *
 *   - Enter : sell 1 CE + 1 PE at the ATM strike at the configured entry time.
 *   - Exit  : first of { profit target, stop loss, configured exit time }.
 *
 * Each `(trading day, expiry)` group forms one session; by default only the
 * nearest expiry per trading day is traded. Positions are squared off by the
 * end of the session (configurable via `--exit`).
 *
 * Usage:
 *   node scripts/backtest-straddle.mjs
 *   node scripts/backtest-straddle.mjs --data-dir ../nifty-optionchain-data/data/chains
 *   node scripts/backtest-straddle.mjs --from 2026-05-01 --to 2026-07-31
 *   node scripts/backtest-straddle.mjs --entry 0930 --exit 1500 --target 0.5 --stop 1.0
 *   node scripts/backtest-straddle.mjs --lot-size 75 --expiries all --json backtest-result.json
 *
 * Data dir resolution (first match wins):
 *   1. `--data-dir` argument
 *   2. `OPTIONCHAIN_DATA_DIR` environment variable
 *   3. `./data/chains`
 *   4. `../nifty-optionchain-data/data/chains`
 *   5. `../../nifty-optionchain-data/data/chains`
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const DEFAULTS = {
  dataDir: null,
  from: null,
  to: null,
  entry: '0915',
  exit: '1530',
  target: 0.5,
  stop: 1.0,
  lotSize: 75,
  expiries: 'nearest', // 'nearest' | 'all'
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
  config.entry = normalizeHHmm(config.entry, DEFAULTS.entry);
  config.exit = normalizeHHmm(config.exit, DEFAULTS.exit);
  config.expiries = config.expiries === 'all' ? 'all' : 'nearest';

  if (config.target < 0 || config.target >= 1) {
    console.error(
      `Invalid --target "${config.target}" (must be in [0, 1)). Using default.`,
    );
    config.target = DEFAULTS.target;
  }
  if (config.stop < 0) {
    console.error(
      `Invalid --stop "${config.stop}" (must be >= 0). Using default.`,
    );
    config.stop = DEFAULTS.stop;
  }
  if (config.entry >= config.exit) {
    console.error(
      `--entry (${config.entry}) must be earlier than --exit (${config.exit}).`,
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
    // Skip directories outside the requested range BEFORE reading any files.
    // This keeps memory usage proportional to the date range instead of the
    // full dataset (16k+ snapshots would otherwise OOM on small instances).
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

export function getStraddlePremium(row) {
  if (!row) return null;
  const ce = Number(row.calls_ltp);
  const pe = Number(row.puts_ltp);
  if (!Number.isFinite(ce) || !Number.isFinite(pe) || ce <= 0 || pe <= 0)
    return null;
  return ce + pe;
}

/* ------------------------------------------------------------------ */
/* Session simulation                                                  */
/* ------------------------------------------------------------------ */

export function simulateSession(snaps, options) {
  const { entryTime, exitTime, target, stop } = options;

  const entrySnap =
    snaps.find(s => s.time >= entryTime) || snaps[snaps.length - 1];
  if (!entrySnap) {
    return { skipped: true, reason: 'NO_ENTRY_SNAPSHOT' };
  }

  const atmRow = findAtmStrike(entrySnap.rows, entrySnap.index_close);
  const entryPremium = getStraddlePremium(atmRow);
  if (atmRow === null || entryPremium === null) {
    return {
      skipped: true,
      reason: 'NO_VALID_ATM_PREMIUM',
      date: snaps[0].date,
      expiry: snaps[0].expiry,
    };
  }

  const entryIndex = snaps.indexOf(entrySnap);
  const atmStrike = Number(atmRow.strike_price);
  const targetLevel = entryPremium * (1 - target);
  const stopLevel = entryPremium * (1 + stop);

  const mtm = [
    {
      time: entrySnap.time,
      spot: entrySnap.index_close,
      ce: Number(atmRow.calls_ltp),
      pe: Number(atmRow.puts_ltp),
      premium: entryPremium,
      pnlUnit: 0,
    },
  ];

  let exitPremium = entryPremium;
  let exitTimeHit = entrySnap.time;
  let exitReason = 'EOD';
  let lastValid = mtm[0];

  for (let i = entryIndex + 1; i < snaps.length; i++) {
    const snap = snaps[i];
    const row = snap.rows.find(r => Number(r.strike_price) === atmStrike);
    const premium = getStraddlePremium(row);
    if (premium === null) continue;

    lastValid = {
      time: snap.time,
      spot: snap.index_close,
      ce: Number(row.calls_ltp),
      pe: Number(row.puts_ltp),
      premium,
      pnlUnit: entryPremium - premium,
    };
    mtm.push(lastValid);

    if (premium <= targetLevel) {
      exitReason = 'TARGET';
      exitPremium = premium;
      exitTimeHit = snap.time;
      break;
    }
    if (premium >= stopLevel) {
      exitReason = 'STOP';
      exitPremium = premium;
      exitTimeHit = snap.time;
      break;
    }
    if (snap.time >= exitTime) {
      exitReason = 'TIME';
      exitPremium = premium;
      exitTimeHit = snap.time;
      break;
    }
  }

  if (mtm.length === 1) {
    exitReason = 'NO_FOLLOW_UP';
  } else if (exitReason === 'EOD') {
    exitPremium = lastValid.premium;
    exitTimeHit = lastValid.time;
  }

  return {
    skipped: false,
    date: snaps[0].date,
    expiry: snaps[0].expiry,
    source: entrySnap.source,
    entryTime: entrySnap.time,
    exitTime: exitTimeHit,
    atmStrike,
    entryPremium,
    exitPremium,
    exitReason,
    pnlUnit: entryPremium - exitPremium,
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
    totalLots: rows.length * 2 * lotSize,
  };
}

function printReport(sessions, config) {
  const valid = sessions
    .filter(s => !s.skipped)
    .map(s => ({ ...s, pnl: s.pnlUnit * config.lotSize }));
  const skipped = sessions.filter(s => s.skipped);
  const summary = computeSummary(valid, config.lotSize);

  console.log('='.repeat(78));
  console.log(' SHORT STRADDLE AT ATM — NIFTY OPTION CHAIN BACKTEST');
  console.log('='.repeat(78));
  console.log(`Data dir   : ${config.dataDir}`);
  console.log(
    `Range      : ${config.from || 'all'} → ${config.to || 'all'}  (${valid.length} sessions, ${skipped.length} skipped)`,
  );
  console.log(
    `Strategy   : entry ${config.entry.slice(0, 2)}:${config.entry.slice(2)}  exit ${config.exit.slice(0, 2)}:${config.exit.slice(2)}  target ${config.target * 100}%  stop ${config.stop * 100}%  expiries ${config.expiries}`,
  );
  console.log(`Lot size   : ${config.lotSize} (1 CE + 1 PE per session)`);
  console.log('-'.repeat(78));
  console.log(
    ' Date       Expiry     ATM strike  Entry prem  Exit prem  Exit time  Reason   P&L (₹)       P&L %',
  );
  console.log('-'.repeat(78));

  for (const r of valid) {
    const pnlPct = r.entryPremium > 0 ? (r.pnlUnit / r.entryPremium) * 100 : 0;
    console.log(
      ` ${r.date}  ${r.expiry}  ${String(r.atmStrike).padStart(9)}  ${r.entryPremium.toFixed(2).padStart(9)}  ${r.exitPremium.toFixed(2).padStart(9)}  ${r.exitTime.slice(0, 2)}:${r.exitTime.slice(2)}  ${r.exitReason.padEnd(6)}  ${fmtMoney(r.pnl).padStart(13)}  ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`,
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
    `Lots Traded    : ${summary.totalLots} (${valid.length} straddles)`,
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
  const sessions = buildSessions(groups, config.expiries);
  const results = sessions.map(session =>
    simulateSession(session.snaps, {
      entryTime: config.entry,
      exitTime: config.exit,
      target: config.target,
      stop: config.stop,
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
