# API Endpoints Documentation

This document provides a comprehensive list of all available endpoints in the Smart API, along with their parameters and response structures.

---

## Table of Contents

- [Health Check](#health-check)
- [Graceful Shutdown](#graceful-shutdown)
- [API Endpoints](#api-endpoints)
  - [Warmup](#1-warmup)
  - [Get All Indices](#2-get-all-indices)
  - [Place Order](#3-place-order)
  - [Get LTP](#4-get-ltp)
  - [Search Scrip](#5-search-scrip)
- [Algorithm Endpoints](#algorithm-endpoints)
  - [Run Short Straddle](#1-run-short-straddle)

---

## Health Check

### `GET /`

**Description:** Health check route to verify if the server is running.

**Request:**

- **Method:** `GET`
- **Body:** None
- **Headers:** None

**Response:**

```json
{
  "status": "ok",
  "lastUpdated": "2023-08-18, 00:33:00"
}
```

**Example:**

```bash
curl http://localhost:3000/
```

---

## Graceful Shutdown

### `GET /kill`

**Description:** Initiates a graceful shutdown of the server.

**Request:**

- **Method:** `GET`
- **Body:** None
- **Headers:** None

**Response:**

```
Execution of the 'Kill Algo' command has been initiated.
```

**Example:**

```bash
curl http://localhost:3000/kill
```

**Note:** The server will shutdown after 1 second. All active connections will be closed gracefully.

---

## API Endpoints

All API endpoints require authentication credentials in the request body.

### 1. Warmup

### `POST /api/warmup`

**Description:** Warms up the application by fetching the scrip master data. This should be called before executing any trades.

**Request:**

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "api_key": "string",
    "client_code": "string",
    "client_pin": "string",
    "client_totp_pin": "string"
  }
  ```

**Response:**

**Success (200):**

```json
{
  "response": "success"
}
```

**Error (500):**

```json
{
  "response": "error message or error object"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/warmup \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "client_code": "YOUR_CLIENT_CODE",
    "client_pin": "YOUR_CLIENT_PIN",
    "client_totp_pin": "YOUR_CLIENT_TOTP_PIN"
  }'
```

---

### 2. Get All Indices

### `POST /api/getAllIndices`

**Description:** Fetches the LTP (Last Traded Price) data for all major indices including VIX, NIFTY, BANKNIFTY, and SENSEX.

**Request:**

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "api_key": "string",
    "client_code": "string",
    "client_pin": "string",
    "client_totp_pin": "string"
  }
  ```

**Response:**

**Success (200):**

```json
{
  "data": {
    "VIX": {
      "exchange": "string",
      "tradingsymbol": "string",
      "symboltoken": "string",
      "open": 0,
      "high": 0,
      "low": 0,
      "close": 0,
      "ltp": 0
    },
    "NIFTY": {
      "exchange": "string",
      "tradingsymbol": "string",
      "symboltoken": "string",
      "open": 0,
      "high": 0,
      "low": 0,
      "close": 0,
      "ltp": 0
    },
    "BANKNIFTY": {
      "exchange": "string",
      "tradingsymbol": "string",
      "symboltoken": "string",
      "open": 0,
      "high": 0,
      "low": 0,
      "close": 0,
      "ltp": 0
    },
    "SENSEX": {
      "exchange": "string",
      "tradingsymbol": "string",
      "symboltoken": "string",
      "open": 0,
      "high": 0,
      "low": 0,
      "close": 0,
      "ltp": 0
    }
  }
}
```

**Error Response:**
If a specific index fails to fetch:

```json
{
  "data": {
    "VIX": {
      "error": "No data found"
    },
    "NIFTY": {
      "exchange": "...",
      "tradingsymbol": "...",
      ...
    }
  }
}
```

**General Error (500):**

```json
{
  "response": "error message or error object"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/getAllIndices \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "client_code": "YOUR_CLIENT_CODE",
    "client_pin": "YOUR_CLIENT_PIN",
    "client_totp_pin": "YOUR_CLIENT_TOTP_PIN"
  }'
```

---

### 3. Place Order

### `POST /api/placeOrder`

**Description:** Places an order for a stock or option. You can either provide the exact `quantity` or use `lotSize` with optional `lots` multiplier.

**Request:**

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "api_key": "string",
    "client_code": "string",
    "client_pin": "string",
    "client_totp_pin": "string",
    "tradingsymbol": "string",
    "symboltoken": "string",
    "transactionType": "BUY" | "SELL",
    "exchange": "string",
    "quantity": 0,
    "lotSize": 0,
    "lots": 0,
    "productType": "CARRYFORWARD" | "DELIVERY" | "MARGIN" | "INTRADAY" | "BO",
    "variety": "NORMAL" | "STOPLOSS",
    "ordertype": "MARKET" | "LIMIT" | "STOPLOSS_LIMIT" | "STOPLOSS_MARKET",
    "price": 0,
    "triggerprice": 0,
    "isHedge": false
  }
  ```

**Parameters:**

**Required:**

- `api_key` (string): Your Smart API key
- `client_code` (string): Your client code
- `client_pin` (string): Your client PIN
- `client_totp_pin` (string): Your TOTP PIN for two-factor authentication
- `tradingsymbol` (string): The trading symbol of the instrument
- `symboltoken` (string): The token/symbol token of the instrument
- `transactionType` (string): Either "BUY" or "SELL"
- Either `quantity` OR `lotSize` must be provided:
  - `quantity` (number): Direct quantity to trade (optional if lotSize is provided)
  - `lotSize` (number): Lot size of the instrument (optional if quantity is provided)
  - `lots` (number): Number of lots (optional, defaults to 1 if lotSize is used)

**Optional:**

- `exchange` (string): Exchange code - "NFO", "NSE", "BSE", etc. (defaults to "NFO")
- `productType` (string): Product type - "CARRYFORWARD", "DELIVERY", "MARGIN", "INTRADAY", "BO" (defaults to "CARRYFORWARD")
- `variety` (string): Order variety - "NORMAL" or "STOPLOSS" (defaults to "NORMAL")
- `ordertype` (string): Order type - "MARKET", "LIMIT", "STOPLOSS_LIMIT", "STOPLOSS_MARKET" (defaults to "MARKET")
- `price` (number): Price for LIMIT orders
- `triggerprice` (number): Trigger price for STOPLOSS orders
- `isHedge` (boolean): Whether this is a hedge order (defaults to false)

**Response:**

**Success (200):**

```json
{
  "data": {
    "status": true,
    "message": "success",
    "errorcode": "",
    "data": {
      "script": "NFO:BANKNIFTY24405PE50000",
      "orderid": "1234567890"
    }
  }
}
```

**Error (400):**

```json
{
  "error": "Missing required fields: tradingsymbol, symboltoken, and transactionType are required"
}
```

**Error (500):**

```json
{
  "error": "Failed to place order"
}
```

**Example - Using Quantity:**

```bash
curl -X POST http://localhost:3000/api/placeOrder \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "client_code": "YOUR_CLIENT_CODE",
    "client_pin": "YOUR_CLIENT_PIN",
    "client_totp_pin": "YOUR_CLIENT_TOTP_PIN",
    "tradingsymbol": "BANKNIFTY24405PE50000",
    "symboltoken": "54321",
    "transactionType": "SELL",
    "exchange": "NFO",
    "quantity": 50,
    "productType": "CARRYFORWARD",
    "ordertype": "MARKET"
  }'
```

**Example - Using Lot Size:**

```bash
curl -X POST http://localhost:3000/api/placeOrder \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "client_code": "YOUR_CLIENT_CODE",
    "client_pin": "YOUR_CLIENT_PIN",
    "client_totp_pin": "YOUR_CLIENT_TOTP_PIN",
    "tradingsymbol": "BANKNIFTY24405PE50000",
    "symboltoken": "54321",
    "transactionType": "BUY",
    "exchange": "NFO",
    "lotSize": 15,
    "lots": 2,
    "productType": "INTRADAY",
    "ordertype": "LIMIT",
    "price": 150.50
  }'
```

---

### 4. Get LTP

### `POST /api/getLtp`

**Description:** Fetches the Last Traded Price (LTP) and other market data (open, high, low, close) for a stock or option.

**Request:**

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "api_key": "string",
    "client_code": "string",
    "client_pin": "string",
    "client_totp_pin": "string",
    "exchange": "string",
    "tradingsymbol": "string",
    "symboltoken": "string"
  }
  ```

**Parameters:**

- `api_key` (required, string): Your Smart API key
- `client_code` (required, string): Your client code
- `client_pin` (required, string): Your client PIN
- `client_totp_pin` (required, string): Your TOTP PIN for two-factor authentication
- `exchange` (required, string): Exchange code - "NFO", "NSE", "BSE", etc.
- `tradingsymbol` (required, string): The trading symbol of the instrument
- `symboltoken` (required, string): The token/symbol token of the instrument

**Response:**

**Success (200):**

```json
{
  "data": {
    "exchange": "NFO",
    "tradingsymbol": "BANKNIFTY24405PE50000",
    "symboltoken": "54321",
    "open": 145.5,
    "high": 152.3,
    "low": 143.2,
    "close": 148.75,
    "ltp": 150.25
  }
}
```

**Error (400):**

```json
{
  "error": "Missing required fields: exchange, tradingsymbol, and symboltoken are required"
}
```

**Error (500):**

```json
{
  "error": "Failed to fetch LTP data"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/getLtp \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "client_code": "YOUR_CLIENT_CODE",
    "client_pin": "YOUR_CLIENT_PIN",
    "client_totp_pin": "YOUR_CLIENT_TOTP_PIN",
    "exchange": "NFO",
    "tradingsymbol": "BANKNIFTY24405PE50000",
    "symboltoken": "54321"
  }'
```

---

### 5. Search Scrip

### `POST /api/searchScrip`

**Description:** Searches for a stock or option by name across different exchanges. Useful for finding instrument tokens and symbols.

**Request:**

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "api_key": "string",
    "client_code": "string",
    "client_pin": "string",
    "client_totp_pin": "string",
    "scripName": "string",
    "exchange": "string"
  }
  ```

**Parameters:**

- `api_key` (required, string): Your Smart API key
- `client_code` (required, string): Your client code
- `client_pin` (required, string): Your client PIN
- `client_totp_pin` (required, string): Your TOTP PIN for two-factor authentication
- `scripName` (required, string): The name or symbol to search for (e.g., "BANKNIFTY", "RELIANCE", "NIFTY24405PE50000")
- `exchange` (optional, string): Exchange to search in - "NFO", "NSE", "BSE", etc. (defaults to "NFO")

**Response:**

**Success (200):**

```json
{
  "data": [
    {
      "exch_seg": "NFO",
      "token": "54321",
      "symbol": "BANKNIFTY24405PE50000",
      "name": "BANKNIFTY",
      "expiry": "24MAY2024",
      "strike": "50000",
      "lotsize": "15",
      "instrumenttype": "OPTIDX",
      "tick_size": "0.05"
    }
  ]
}
```

**Error (400):**

```json
{
  "error": "Missing required field: scripName is required"
}
```

**Error (500):**

```json
{
  "error": "Failed to search scrip"
}
```

**Example - Search in NFO (Options):**

```bash
curl -X POST http://localhost:3000/api/searchScrip \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "client_code": "YOUR_CLIENT_CODE",
    "client_pin": "YOUR_CLIENT_PIN",
    "client_totp_pin": "YOUR_CLIENT_TOTP_PIN",
    "scripName": "BANKNIFTY24405PE50000",
    "exchange": "NFO"
  }'
```

**Example - Search in NSE (Stocks):**

```bash
curl -X POST http://localhost:3000/api/searchScrip \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "client_code": "YOUR_CLIENT_CODE",
    "client_pin": "YOUR_CLIENT_PIN",
    "client_totp_pin": "YOUR_CLIENT_TOTP_PIN",
    "scripName": "RELIANCE",
    "exchange": "NSE"
  }'
```

---

## Algorithm Endpoints

### 1. Run Short Straddle

### `POST /algo/run-short-straddle`

**Description:** Executes the short straddle trading algorithm for BankNifty index options.

**Request:**

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "api_key": "string",
    "client_code": "string",
    "client_pin": "string",
    "client_totp_pin": "string",
    "lots": 0,
    "loss_per_lot": 0
  }
  ```

**Parameters:**

- `api_key` (required, string): Your Smart API key
- `client_code` (required, string): Your client code
- `client_pin` (required, string): Your client PIN
- `client_totp_pin` (required, string): Your TOTP PIN for two-factor authentication
- `lots` (required, number): Number of lots to trade
- `loss_per_lot` (required, number): Maximum loss per lot in rupees

**Response:**

**Success (200):**

```json
{
  "response": "response message from the algorithm"
}
```

**Error (500):**

```json
{
  "response": "error message or error object"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/algo/run-short-straddle \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "client_code": "YOUR_CLIENT_CODE",
    "client_pin": "YOUR_CLIENT_PIN",
    "client_totp_pin": "YOUR_CLIENT_TOTP_PIN",
    "lots": 1,
    "loss_per_lot": 3500
  }'
```

---

## Base URL

- **Local Development:** `http://localhost:3000`
- **Production:** `https://smart-api-cloud-run-hjua72ioaq-uc.a.run.app`

---

## Authentication

All API and Algorithm endpoints require the following authentication credentials in the request body:

```json
{
  "api_key": "YOUR_SMART_API_KEY",
  "client_code": "YOUR_CLIENT_CODE",
  "client_pin": "YOUR_CLIENT_PIN",
  "client_totp_pin": "YOUR_TOTP_PIN"
}
```

---

## Error Handling

All endpoints follow a consistent error response format. For validation errors (400), the format is:

```json
{
  "error": "error message"
}
```

For server errors (500), the format may vary:

```json
{
  "response": "error message or error object"
}
```

or

```json
{
  "error": "error message"
}
```

**HTTP Status Codes:**

- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## Notes

1. The **Warmup** endpoint should be called before executing any trades to ensure all necessary data is loaded.
2. The **Get All Indices** endpoint fetches data in parallel for optimal performance.
3. The **Place Order** endpoint supports both direct quantity specification and lot-based calculations. If both `quantity` and `lotSize` are provided, `quantity` takes precedence.
4. The **Get LTP** endpoint is useful for real-time price checking before placing orders.
5. The **Search Scrip** endpoint helps find instrument tokens and symbols needed for other endpoints. Try searching for partial names (e.g., "BANKNIFTY" or "RELIANCE").
6. The **Run Short Straddle** endpoint executes a complex trading algorithm and may take some time to complete.
7. The **Kill** endpoint initiates a graceful shutdown and should be used when terminating the server.

---

## Disclaimer

Trading involves risks, and past performance is not indicative of future results. Use this API responsibly and ensure you understand the algorithms before executing trades.
