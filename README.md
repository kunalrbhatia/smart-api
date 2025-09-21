# Intraday Trading Algorithm

## Overview

This repository contains the implementation of an intraday trading algorithm developed by Kunal, a full-stack developer based in Mumbai, India. Kunal, who is also a proactive stock market trader, has crafted an algorithmic approach to capitalize on intraday opportunities in the BankNifty index options.

The algorithm is built with Node.js, Express, and TypeScript. It uses the SmartAPI for trade execution and Firebase for data storage.

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
2.  Open the `.env` file and add your credentials for SmartAPI and Firebase.

## Running the Application

To start the application, run the following command:

```bash
npm start
```

The server will start on the port specified in your `.env` file (default is 3000).

## API Endpoints

### `/`

-   **Method**: `GET`
-   **Description**: Health check route to check if the server is running.
-   **Response**:
    ```json
    {
      "status": "ok",
      "lastUpdated": "2023-08-18, 00:33:00"
    }
    ```

### `/api/warmup`

-   **Method**: `POST`
-   **Description**: Warms up the application by fetching the scrip master data. This should be called before executing any trades.
-   **Request Body**:
    ```json
    {
      "api_key": "YOUR_API_KEY",
      "client_code": "YOUR_CLIENT_CODE",
      "client_pin": "YOUR_CLIENT_PIN",
      "client_totp_pin": "YOUR_CLIENT_TOTP_PIN"
    }
    ```
-   **Response**:
    ```json
    {
      "response": "success"
    }
    ```

### `/api/getAllIndices`

-   **Method**: `POST`
-   **Description**: Fetches the LTP (Last Traded Price) for all major indices (NIFTY, BANKNIFTY, SENSEX, INDIA VIX).
-   **Request Body**:
    ```json
    {
      "api_key": "YOUR_API_KEY",
      "client_code": "YOUR_CLIENT_CODE",
      "client_pin": "YOUR_CLIENT_PIN",
      "client_totp_pin": "YOUR_CLIENT_TOTP_PIN"
    }
    ```
-   **Response**:
    ```json
    {
      "data": {
        "VIX": {
          "ltp": 12.34
        },
        "NIFTY": {
          "ltp": 19000.00
        },
        "BANKNIFTY": {
          "ltp": 44000.00
        },
        "SENSEX": {
          "ltp": 65000.00
        }
      }
    }
    ```

### `/algo/run-short-straddle`

-   **Method**: `POST`
-   **Description**: Executes the short straddle trading algorithm.
-   **Request Body**:
    ```json
    {
      "api_key": "YOUR_API_KEY",
      "client_code": "YOUR_CLIENT_CODE",
      "client_pin": "YOUR_CLIENT_PIN",
      "client_totp_pin": "YOUR_CLIENT_TOTP_PIN",
      "lots": 1,
      "loss_per_lot": 3500
    }
    ```
-   **Response**:
    ```json
    {
      "response": "some response from the algorithm"
    }
    ```

### `/kill`

-   **Method**: `GET`
-   **Description**: Initiates a graceful shutdown of the server.
-   **Response**:
    ```
    Execution of the 'Kill Algo' command has been initiated.
    ```

## Disclaimer

Trading involves risks, and past performance is not indicative of future results. Kunal encourages users to thoroughly understand the algorithm, backtest it, and use it responsibly.

Feel free to reach out to Kunal for any clarifications or improvements to the algorithm.
