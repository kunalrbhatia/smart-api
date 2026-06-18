# Multi-Channel Priority Pattern

A robust notification system should allow multiple channels to be configured but deterministically select the primary one based on user preference or priority.

## Decoupled Architecture

1. **Configuration**: Use toggles in `.env` (e.g., `USE_TELEGRAM=true`).
2. **Helper Modules**: Specific senders for each channel (Slack, Telegram, etc.).
3. **Notifier Facade**: A generic `notify` function that handles priority.

### Example Priority Logic

```typescript
export const notify = async (message: string): Promise<void> => {
  if (config.useTelegram) {
    await sendTelegramMessage(message);
  } else if (config.useSlack) {
    await sendSlackMessage(message);
  } else {
    console.log('No notification channel enabled.');
  }
};
```

## Benefits

- Prevents duplicate alerts across channels.
- Allows easy switching without code changes.
- Simplifies the calling code (just call `notify`).
