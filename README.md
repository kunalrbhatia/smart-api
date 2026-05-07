# Intraday Trading Algorithm

## Overview

This repository contains the implementation of an intraday trading algorithm developed by Kunal, a full-stack developer based in Mumbai, India. Kunal, who is also a proactive stock market trader, has crafted an algorithmic approach to capitalize on intraday opportunities in the BankNifty index options.

The algorithm is built with Node.js, Express, and TypeScript. It uses the SmartAPI for trade execution.

## Features

- **Automated Login:** Enhanced security with automated 6-digit TOTP generation from 16-character secret keys.
- **Dynamic Networking:** Automatic resolution of Public IP, Local IP, and MAC address for compliant API headers.
- **Short Straddle Strategy:** Automated execution for BankNifty index options.
- **Dynamic Adjustments:** Real-time adjustments based on market movements.
- **Risk Management:** Built-in MTM tracking and stop-loss criteria.
- **Graceful Shutdown:** Safe execution termination via `/kill` endpoint or signals.

## Prerequisites

Before you begin, ensure you have the following:

- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)
- A [SmartAPI](https://smartapi.angelbroking.com/) account and API Key.
- Your 16-character TOTP Secret Key from Angel Broking.

## Installation

1.  Clone the repository:
    ```powershell
    git clone https://github.com/kunalrbhatia/smart-api.git
    cd smart-api
    ```
2.  Install dependencies:
    ```powershell
    npm install
    ```

## Configuration

1.  Create a `.env` file from the example:
    ```powershell
    Copy-Item .env.example .env
    ```
2.  Fill in your SmartAPI credentials. Note that `CLIENT_TOTP_PIN` should now contain your **16-character TOTP secret key** for automated login.

## Running the Application

To start the application, run the following command:

```bash
npm start
```

The server will start on the port specified in your `.env` file (default is 3000).

## API Endpoints

For detailed API endpoint documentation, please refer to [ENDPOINTS.md](ENDPOINTS.md).



## Disclaimer

Trading involves risks, and past performance is not indicative of future results. Kunal encourages users to thoroughly understand the algorithm, backtest it, and use it responsibly.

Feel free to reach out to Kunal for any clarifications or improvements to the algorithm.
