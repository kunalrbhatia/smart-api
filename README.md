# Intraday Trading Algorithm

## Overview

This repository contains the implementation of an intraday trading algorithm developed by Kunal, a full-stack developer based in Mumbai, India. Kunal, who is also a proactive stock market trader, has crafted an algorithmic approach to capitalize on intraday opportunities in the BankNifty index options.

The algorithm is built with Node.js, Express, and TypeScript. It uses the SmartAPI for trade execution.

## Features

- Short straddle strategy for BankNifty index options.
- Dynamic adjustments based on market movements.
- Real-time MTM (Mark to Market) tracking.
- Risk management with stop-loss criteria.
- Graceful shutdown mechanism.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/en/) (v14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/intraday-trading-algorithm.git
    cd intraday-trading-algorithm
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```

## Configuration

1.  Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
2.  Open the `.env` file and add your credentials for SmartAPI.

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
