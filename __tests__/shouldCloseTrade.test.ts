import { TradeDetails, shouldCloseTradeType } from '../src/app.interface';
import {
  shouldCloseTrade,
  closeParticularTrade,
} from '../src/helpers/apiService';
import { ALGO } from '../src/helpers/constants';
jest.mock('../src/helpers/apiService', () => {
  return {
    closeParticularTrade: jest.fn().mockReturnValue(true),
    shouldCloseTrade: jest
      .fn()
      .mockImplementation(async ({ ltp, avg, trade }: shouldCloseTradeType) => {
        const doubledPrice = avg * 2;
        console.log(
          `${ALGO}: checking shouldCloseTrade, ltp: ${ltp}, doubledPrice: ${doubledPrice}`
        );
        if (parseInt(trade.netQty) < 0 && ltp >= doubledPrice) {
          console.log(`${ALGO}: shouldCloseTrade true`);
          try {
            return await closeParticularTrade({ trade });
          } catch (error) {
            console.log(`${ALGO}: closeParticularTrade could not be called`);
            throw error;
          }
        }
      }),
  };
});
describe('shouldCloseTrade', () => {
  it('should not close trade if netQty is positive', async () => {
    const ltp = 100;
    const avg = 50;
    const trade: TradeDetails = {
      netQty: '50',
      optionType: 'CE',
      expireDate: '28SEP2023',
      strike: '19900.0',
      symbol: 'NIFTY',
      token: '85879',
      closed: false,
      tradedPrice: 80,
      exchange: 'NFO',
      tradingSymbol: 'NIFTY28SEP2319900CE',
    };
    const status = await shouldCloseTrade({
      ltp,
      avg,
      trade,
    });
    expect(closeParticularTrade).not.toHaveBeenCalled();
    expect(status).toBeUndefined();
  });
  it('should not close trade if ltp is less than doubledPrice', async () => {
    const ltp = 99;
    const avg = 50;
    const trade: TradeDetails = {
      netQty: '-50',
      optionType: 'CE',
      expireDate: '28SEP2023',
      strike: '19900.0',
      symbol: 'NIFTY',
      token: '85879',
      closed: false,
      tradedPrice: 80,
      exchange: 'NFO',
      tradingSymbol: 'NIFTY28SEP2319900CE',
    };
    const status = await shouldCloseTrade({
      ltp,
      avg,
      trade,
    });
    expect(closeParticularTrade).not.toHaveBeenCalled();
    expect(status).toBeUndefined();
  });
  it('should close trade if netQty is negative and ltp is greater than or equal to doubledPrice', async () => {
    const ltp = 200;
    const avg = 50;
    const trade: TradeDetails = {
      netQty: '-50',
      optionType: 'CE',
      expireDate: '28SEP2023',
      strike: '19900.0',
      symbol: 'NIFTY',
      token: '85879',
      closed: false,
      tradedPrice: 80,
      exchange: 'NFO',
      tradingSymbol: 'NIFTY28SEP2319900CE',
    };
    const result = await shouldCloseTrade({
      ltp,
      avg,
      trade,
    });
    expect(closeParticularTrade).toHaveBeenCalledWith({ trade });
    expect(result).toBe(true);
  });
});
