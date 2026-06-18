# BLUEPRINT: Slack Interactive Slash Commands

This blueprint provides a template for implementing two-way communication between Slack and your Node.js application using **Slash Commands**.

## 1. Concept: Webhook (One-Way) vs. Slash Commands (Two-Way)

- **Incoming Webhooks**: Good for sending alerts _from_ the Algo _to_ Slack.
- **Slash Commands**: Allow you to send a command _from_ Slack (e.g., `/pnl`) which triggers a POST request to your server. Your server then processes the command and responds.

## 2. Requirements

- A public URL for your server (Slack needs to send a POST request to you).
  - _Oracle VM Setup_: You must open the port (e.g., 3000) in both the **Oracle Cloud VCN Security List** and the **VM's local firewall (iptables/ufw)**.
- `express` library to handle the incoming HTTP request.

## 3. Slack API Setup Guide

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and select your app.
2. In the sidebar, click **"Slash Commands"**.
3. Click **"Create New Command"**:
   - **Command**: `/pnl` (or `/status`, `/check`)
   - **Request URL**: `http://<your-vm-ip>:3000/slack/commands`
   - **Short Description**: "Get current P&L summary"
4. Click **Save**.
5. Go to **"Basic Information"** -> **"App Credentials"**. Copy your **Signing Secret**. This is used to verify that requests actually come from Slack.

## 4. Implementation (Embedded Approach)

To save memory on your 1GB VM, add this directly into your `index.js` or a small dedicated module.

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Slack sends URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/slack/commands', (req, res) => {
  const { command, text, user_name } = req.body;

  if (command === '/pnl') {
    // Access your global algo state here
    const currentPnl = '+₹1,200.00';

    res.json({
      response_type: 'ephemeral',
      text: `📊 *Current P&L:* ${currentPnl}`,
    });
  } else {
    res.json({ text: 'Unknown command.' });
  }
});

app.listen(port, () => {
  console.log(`Slack Command Listener active on port ${port}`);
});
```

## 5. Security & Resource Tips (For 1GB RAM)

- **Verification**: Always verify the `X-Slack-Signature` using your `Signing Secret` to ensure requests are legitimate.
- **Express Middleware**: Use only necessary middleware to keep the memory footprint low.
- **Port Forwarding**: Oracle VM default firewall blocks ports. Run:
  `sudo ufw allow 3000/tcp` or `sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT`.
