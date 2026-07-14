/**
 * Report-only post-expiry analysis — generates the markdown report and saves it.
 * No git operations, no PR, no merge. Prints the absolute filepath to stdout.
 *
 * Usage: node scripts/generate-report-only.mjs
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { setCredentials, getCredentials } from 'krb-smart-api-module';
import DataStoreMod from '../dist/store/dataStore.js';
import { getSmartSession } from '../dist/helpers/apiService/session.js';
import { getPositions } from '../dist/helpers/apiService/positions.js';
import { isPaperMode } from '../dist/helpers/paperTrade.js';

const DataStore = DataStoreMod.default;

// --- helpers (mirrors the dist script) ---
const REPORTS_DIR = path.resolve('expiry-reports');

function getIST() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function getDateStr() {
  const d = new Date();
  const opts = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(d);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${day}`;
}

// --- main ---
async function main() {
  console.log(`[gen-report] Starting analysis at ${getIST()}`);

  // 1. Credentials
  const apiKey = process.env.API_KEY;
  const clientCode = process.env.CLIENT_CODE;
  const clientPin = process.env.CLIENT_PIN;
  const clientTotpPin = process.env.CLIENT_TOTP_PIN;
  if (!apiKey || !clientCode || !clientPin || !clientTotpPin) {
    console.error('[gen-report] Missing credentials in .env');
    process.exit(1);
  }

  const creds = {
    APIKEY: apiKey,
    CLIENT_CODE: clientCode,
    CLIENT_PIN: clientPin,
    CLIENT_TOTP_PIN: clientTotpPin,
  };
  setCredentials(creds);
  DataStore.getInstance().setPostData(creds);

  // 2. Login & fetch positions
  console.log('[gen-report] Logging in...');
  const smartSession = await getSmartSession();
  const cred = getCredentials();
  const allPositions = await getPositions(smartSession, cred);
  console.log(`[gen-report] Found ${allPositions.length} total positions`);

  const mode = isPaperMode() ? '📝 PAPER' : '💰 LIVE';

  // 3. Determine today's expiry
  const nowIST = moment().tz('Asia/Kolkata');
  const expiryFormatted = nowIST.format('DDMMMYYYY').toUpperCase();

  // 4. Filter positions to current expiry
  const currentExpiryPositions = allPositions.filter(p => {
    const expiry = (p.expirydate || '').toUpperCase();
    return expiry === expiryFormatted;
  });

  // 5. Build report
  const dateStr = getDateStr();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[nowIST.day()];
  const expiryLabel = `${dayName}, ${dateStr}`;
  const filename = `expiry-${dateStr}.md`;
  const filepath = path.join(REPORTS_DIR, filename);

  let totalRealised = 0,
    totalUnrealised = 0;
  let totalBuyValue = 0,
    totalSellValue = 0;
  let closedCount = 0;
  const rows = [];
  const strikes = new Map();

  for (const p of currentExpiryPositions) {
    const netQty = Number(p.netqty || p.qty || 0);
    const realised = Number(p.realised || 0);
    const unrealised = Number(p.unrealised || 0);
    const buyVal = Number(p.totalbuyvalue || 0);
    const sellVal = Number(p.totalsellvalue || 0);

    totalRealised += realised;
    totalUnrealised += unrealised;
    totalBuyValue += buyVal;
    totalSellValue += sellVal;

    if (netQty === 0) closedCount++;

    const pnl = Number(p.pnl || 0);
    const sym = p.tradingsymbol || p.symbol || 'N/A';
    const status = netQty > 0 ? 'LONG' : netQty < 0 ? 'SHORT' : 'CLOSED';
    rows.push(
      `| ${sym} | ${netQty} | ${status} | ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} | ${pnl >= 0 ? '✅' : '❌'} |`,
    );

    // Straddle pair grouping
    const strike = Number(p.strikeprice);
    const optType = (p.optiontype || '').toLowerCase();
    if (!strikes.has(strike)) strikes.set(strike, { ce: 0, pe: 0 });
    const pair = strikes.get(strike);
    if (optType === 'ce') pair.ce += pnl;
    if (optType === 'pe') pair.pe += pnl;
  }

  const totalPL = totalRealised + totalUnrealised;
  const netPremium = totalSellValue - totalBuyValue;

  // Pair analysis rows
  const pairRows = [];
  for (const [strike, pair] of [...strikes.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const net = pair.ce + pair.pe;
    pairRows.push(
      `| ${strike} | ${pair.ce >= 0 ? '+' : ''}${pair.ce.toFixed(2)} | ${pair.pe >= 0 ? '+' : ''}${pair.pe.toFixed(2)} | ${net >= 0 ? '+' : ''}${net.toFixed(2)} | ${net >= 0 ? '✅' : '❌'} |`,
    );
  }

  const shortCount = currentExpiryPositions.filter(
    p => Number(p.netqty || 0) < 0,
  ).length;
  const longCount = currentExpiryPositions.filter(
    p => Number(p.netqty || 0) > 0,
  ).length;
  const winners = currentExpiryPositions.filter(
    p => Number(p.pnl || 0) > 0,
  ).length;
  const losers = currentExpiryPositions.filter(
    p => Number(p.pnl || 0) < 0,
  ).length;

  const report = [
    `# 📊 Weekly Expiry Analysis — ${expiryLabel}`,
    '',
    '## Overview',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| **Date** | ${expiryLabel} |`,
    `| **Mode** | ${mode} |`,
    `| **Expiry** | ${expiryFormatted} |`,
    `| **Positions** | ${currentExpiryPositions.length} (${closedCount} closed) |`,
    `| **Net Premium** | ₹${netPremium.toFixed(2)} |`,
    '',
    '## P&L Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| **Total P&L** | ₹${totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)} |`,
    `| Realised P&L | ₹${totalRealised >= 0 ? '+' : ''}${totalRealised.toFixed(2)} |`,
    `| Unrealised P&L | ₹${totalUnrealised >= 0 ? '+' : ''}${totalUnrealised.toFixed(2)} |`,
    `| Premium Received | ₹${totalSellValue.toFixed(2)} |`,
    `| Premium Paid | ₹${totalBuyValue.toFixed(2)} |`,
    `| **Result** | ${totalPL >= 0 ? '✅ **PROFIT**' : '❌ **LOSS**'} |`,
    '',
    '---',
    '',
    '## Position Breakdown',
    '',
    '| Symbol | Net Qty | Status | P&L (₹) | |',
    '|--------|---------|--------|---------|-|',
    ...rows,
    '',
    '---',
    '',
    '## Straddle Pair Analysis',
    '',
    '| Strike | CE P&L | PE P&L | Net | |',
    '|--------|--------|--------|-----|-|',
    ...pairRows,
    '',
    '---',
    '',
    '## Position Summary',
    '',
    '| Description | Count |',
    '|-------------|-------|',
    `| Open Short | ${shortCount} |`,
    `| Open Long | ${longCount} |`,
    `| Closed | ${closedCount} |`,
    `| **Winners** | ${winners} |`,
    `| **Losers** | ${losers} |`,
    '',
    '---',
    '',
    `*Generated at ${getIST()} by Hermes Agent*`,
    '',
  ].join('\n');

  // 6. Save
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  fs.writeFileSync(filepath, report);
  console.log(`[gen-report] Report written to ${filepath}`);

  // 7. Print path as last line for the agent
  console.log(filepath);
}

main().catch(err => {
  console.error('[gen-report] Error:', err);
  process.exit(1);
});
