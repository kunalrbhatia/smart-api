# 📊 Weekly Expiry Analysis — Tue, 2026-09-01

## Overview

| Field           | Value           |
| --------------- | --------------- |
| **Index**       | NIFTY           |
| **Date**        | Tue, 2026-09-01 |
| **Mode**        | 💰 LIVE         |
| **Expiry**      | 01SEP2026       |
| **Positions**   | 14 (10 closed)  |
| **Net Premium** | ₹2018.25        |

## P&L Summary (broker-verified 16:26 IST)

| Metric           | Value         |
| ---------------- | ------------- |
| **Total P&L (algo)** | ₹−76.05     |
| **Total P&L (full book incl. niftyicif)** | ₹−1164.80 |
| Realised P&L     | ₹−7722.00     |
| Unrealised P&L   | ₹+6557.20     |
| Premium Received | ₹30972.50     |
| Premium Paid     | ₹28954.25     |
| **Result**       | ❌ **LOSS (algo ≈ breakeven −76; account −1165)** |

> ⚠️ **CORRECTION (16:26)**: The initial automated report showed +₹2046.85 (PROFIT).
> That figure whitelisted only the 8 symbols present in positions.json and missed the
> algo-traded 24000 CE (−6835.40) / 24000 PE (+4712.50) pair that was pruned from
> positions.json during the session's reconcile. Broker GET_POSITIONS truth:
> **algo P&L = −₹76.05** (breakeven), full NIFTY01SEP book = **−₹1164.80** LOSS
> (includes niftyicif foreign legs −₹1088.75).

---

## Position Breakdown (broker truth, all NIFTY01SEP legs)

| Symbol              | Net Qty | Status | P&L (₹)  |     |
| ------------------- | ------- | ------ | -------- | --- |
| NIFTY01SEP2624000CE | 0       | CLOSED | -6835.40 | ❌  |
| NIFTY01SEP2624150PE | 0       | CLOSED | -4186.00 | ❌  |
| NIFTY01SEP2623950CE | 0       | CLOSED | -3861.00 | ❌  |
| NIFTY01SEP2624100PE | 0       | CLOSED | -1952.60 | ❌  |
| NIFTY01SEP2623550PE | 325     | LONG   | -276.25  | ❌  |
| NIFTY01SEP2624550CE | 325     | LONG   | -292.50  | ❌  |
| NIFTY01SEP2624050CE | 0       | CLOSED | +712.40  | ✅  |
| NIFTY01SEP2624900CE | 0       | CLOSED | +780.00  | ✅  |
| NIFTY01SEP2624100CE | 0       | CLOSED | +1796.60 | ✅  |
| NIFTY01SEP2624150CE | 0       | CLOSED | +1885.00 | ✅  |
| NIFTY01SEP2623900PE | 0       | CLOSED | +247.00  | ✅  |
| NIFTY01SEP2623950PE | -65     | SHORT  | +1745.25 | ✅  |
| NIFTY01SEP2624000PE | -65     | SHORT  | +4712.50 | ✅  |
| NIFTY01SEP2624050PE | -65     | SHORT  | +4360.20 | ✅  |

---

## Straddle Pair Analysis (algo legs)

| Strike | CE P&L   | PE P&L   | Net      |     |
| ------ | -------- | -------- | -------- | --- |
| 24000  | -6835.40 | +4712.50 | -2122.90 | ❌  |
| 24050  | +712.40  | +4360.20 | +5072.60 | ✅  |
| 24100  | +1796.60 | -1952.60 | -156.00  | ❌  |
| 24150  | +1885.00 | -4186.00 | -2301.00 | ❌  |
| 23550  | +0.00    | -276.25  | -276.25  | ❌  |
| 24550  | -292.50  | +0.00    | -292.50  | ❌  |

---

## Position Summary

| Description | Count |
| ----------- | ----- |
| Open Short  | 3     |
| Open Long   | 2     |
| Closed      | 9     |

## Session Notes

- First live day of PR #113 (close-breached-leg) + PR #114 (MTM signal removed 14:04).
- Algo closed legs one-by-one through the stops; the MTM signal (removed) had wrongly
  selected a green 24100 CE (mixed cost-basis bug) — PR #114 makes green legs unclosable.
- Kill switch engaged 14:59; remaining shorts rode to expiry.
- **Known gap**: automated report whitelists positions.json symbols only; legs pruned
  mid-session (24000 pair) are missed → report underestimated the loss. Fix pending.
