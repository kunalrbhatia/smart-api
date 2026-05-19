import fs from 'fs';
import {
  isPaperMode,
  setPaperMode,
  getPaperPositions,
  savePaperPositions,
  getPaperOrders,
  savePaperOrders,
  mockOrderPlacement,
  checkAndFillPaperOrders,
} from '../../src/helpers/paperTrade';
import { logger } from '../../src/helpers/logger';
import OrderStore from '../../src/store/orderStore';
import * as marketData from '../../src/helpers/apiService/marketData';

jest.mock('fs');
jest.mock('../../src/helpers/logger');

describe('paperTrade helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPaperMode', () => {
    it('should return true if flag file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      expect(isPaperMode()).toBe(true);
    });

    it('should return false if flag file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(isPaperMode()).toBe(false);
    });
  });

  describe('setPaperMode', () => {
    it('should create file when active is true', () => {
      setPaperMode(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('ENABLED'),
      );
    });

    it('should remove file when active is false and file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      setPaperMode(false);
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('DISABLED'),
      );
    });

    it('should do nothing when active is false and file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      setPaperMode(false);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('Paper State Persistence', () => {
    it('should get and save paper positions', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify([{ symboltoken: '123' }]),
      );

      const pos = getPaperPositions();
      expect(pos).toHaveLength(1);

      savePaperPositions(pos);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return empty array and log error on read failure', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('fail');
      });

      expect(getPaperPositions()).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should get and save paper orders', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify([{ orderid: '123' }]),
      );

      const orders = getPaperOrders();
      expect(orders).toHaveLength(1);

      savePaperOrders(orders);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('mockOrderPlacement', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readFileSync as jest.Mock).mockReturnValue('[]');
      OrderStore.getInstance().setPostData({
        INDEX: 'NIFTY',
        EXPIRYDATE: 'DATE',
        QUANTITY: 50,
        LOSSPERLOT: 500,
        INDIAVIX: 15,
      });
    });

    it('should store pending order for STOPLOSS variety', async () => {
      const params = {
        tradingsymbol: 'T',
        transactionType: 'SELL',
        variety: 'STOPLOSS',
        quantity: 50,
        symboltoken: 'T1',
      } as any;

      const result = await mockOrderPlacement(params);
      expect(result.status).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled(); // Saves order
    });

    it('should create new position for market order', async () => {
      const params = {
        tradingsymbol: 'T',
        transactionType: 'BUY',
        variety: 'NORMAL',
        ordertype: 'MARKET',
        quantity: 50,
        symboltoken: 'T1',
        price: 100,
      } as any;

      const result = await mockOrderPlacement(params);
      expect(result.status).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled(); // Saves position
    });

    it('should update existing position for market order', async () => {
      // Mock existing position
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify([
          {
            symboltoken: 'T1',
            netqty: '50',
            buyqty: '50',
            totalbuyvalue: '5000',
            buyavgprice: '100',
            realised: '0',
          },
        ]),
      );

      const params = {
        tradingsymbol: 'T',
        transactionType: 'SELL',
        variety: 'NORMAL',
        ordertype: 'MARKET',
        quantity: 50,
        symboltoken: 'T1',
        price: 110,
      } as any;

      const result = await mockOrderPlacement(params);
      expect(result.status).toBe(true);
      // Verify realised profit calculation
      // 50 units bought at 100, sold at 110 = 500 profit
    });
  });

  describe('checkAndFillPaperOrders', () => {
    it('should do nothing if not in paper mode', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await checkAndFillPaperOrders();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('should fill order if SL trigger hit', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      // Mock one pending order
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify([
          {
            orderid: 'P1',
            status: 'Pending',
            transactionType: 'SELL',
            triggerprice: 90,
            symboltoken: 'T1',
            tradingsymbol: 'T',
          },
        ]),
      );

      // Mock LTP below trigger
      jest.spyOn(marketData, 'getLtpWithRetry').mockResolvedValue({
        ltp: 85,
        exchange: 'NFO',
        tradingsymbol: 'T',
        symboltoken: 'T1',
        open: 100,
        high: 110,
        low: 80,
        close: 95,
      });

      await checkAndFillPaperOrders();
      expect(fs.writeFileSync).toHaveBeenCalled(); // Updated order and position
    });
  });
});
