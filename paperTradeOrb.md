# Blueprint: Live Paper Trading System

This blueprint describes a high-fidelity paper trading pattern for algorithmic trading bots. It allows the strategy to run against live market data without executing real orders on a broker's platform.

## 1. State Management & Toggle

- **Toggle Mechanism:** Implement a command (e.g., `/paper-on`, `/paper-off` via Telegram/CLI) to switch modes.
- **Persistence:** Use a flag file (e.g., `.paper-trade`) in the root directory.
  - If file exists: **Paper Mode ACTIVE**.
  - If file missing: **Live Mode ACTIVE**.
- **Detection:** A helper function `isPaperMode()` should check for this file's existence throughout the app.

## 2. Order Abstraction Layer

Intercept all broker-bound requests in a centralized order helper.

- **Mock Placement:** Instead of calling the broker's `place_order` API, return a mock ID prefixed with `PAPER-` (e.g., `PAPER-1715345600`).
- **Mock Actions:** `cancel_order` and `modify_order` should log the intent and return success immediately without API calls.
- **Data Integrity:** Keep the same data structures (Order IDs, Symbols, Tokens) so the rest of the application logic remains unaware it is in paper mode.

## 3. Simulated Execution (The "Fill" Logic)

Since paper orders don't exist on the exchange, the bot must manually simulate order fills (specifically Stop-Loss and Take-Profit).

- **LTP Polling:** The bot must fetch the Last Traded Price (LTP) of active positions regularly (e.g., every 1-5 seconds).
- **Virtual Trigger:** Compare the LTP against the `triggerPrice` or `slValue` stored in the app's state.
- **Manual Exit:** If the price crosses the threshold, trigger the `exitTrade()` logic manually. This bypasses the need for the exchange to "hit" an order.

## 4. Observability & Safety

- **Visual Prefix:** All notifications (Telegram, Discord, Slack) and logs must be prefixed with `[PAPER]` or `[MOCK]` to prevent confusion with live capital.
- **Logging:** Log the "Mocked" action explicitly: `[PAPER MODE] Mocking order placement for NIFTY25MAY21000CE`.
- **Isolation:** Ensure the `isPaperMode()` check is the very first line in the order placement function to prevent accidental live trades.

## 5. Implementation Example (Pseudo-code)

```typescript
function placeOrder(params) {
  if (isPaperMode()) {
    const paperId = `PAPER-${Date.now()}`;
    logger.info(`[PAPER] Mocking order: ${paperId}`);
    return paperId;
  }
  return broker.actualPlaceOrder(params);
}

function tradeMonitor() {
  const trade = getActiveTrade();
  const currentLtp = getLtp(trade.token);

  if (isPaperMode() && currentLtp <= trade.slValue) {
    exitTrade('Paper SL Hit');
  }
}
```
