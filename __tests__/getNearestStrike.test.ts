import { TradeDetails } from '../src/app.interface';
import { getNearestStrike } from '../src/helpers/functions';
describe('getNearestStrike', () => {
  it('should return the nearest strike number when algoTrades has only one trade', () => {
    const algoTrades: TradeDetails[] = [
      {
        optionType: 'CE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44300',
        token: '60481',
        symbol: 'BANKNIFTY31AUG2344300CE',
        closed: false,
        tradedPrice: 270,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344300CE',
      },
      {
        optionType: 'PE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44300',
        token: '60482',
        symbol: 'BANKNIFTY31AUG2344300PE',
        closed: false,
        tradedPrice: 242,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344300PE',
      },
    ];
    const atmStrike = 44300;
    const result = getNearestStrike({
      algoTrades: algoTrades,
      atmStrike: atmStrike,
    });
    expect(result).toBe(44300);
  });
  it('should return the nearest strike number when algoTrades has multiple trades', () => {
    const algoTrades: TradeDetails[] = [
      {
        optionType: 'CE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44300',
        token: '60481',
        symbol: 'BANKNIFTY31AUG2344300CE',
        closed: false,
        tradedPrice: 270,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344300CE',
      },
      {
        optionType: 'PE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44300',
        token: '60482',
        symbol: 'BANKNIFTY31AUG2344300PE',
        closed: false,
        tradedPrice: 242,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344300PE',
      },
      {
        optionType: 'CE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44100',
        token: '60477',
        symbol: 'BANKNIFTY31AUG2344100CE',
        closed: false,
        tradedPrice: 235,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344100CE',
      },
      {
        optionType: 'PE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44100',
        token: '60478',
        symbol: 'BANKNIFTY31AUG2344100PE',
        closed: false,
        tradedPrice: 295,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344100PE',
      },
    ];
    const atmStrike = 44400;
    const result = getNearestStrike({
      algoTrades: algoTrades,
      atmStrike: atmStrike,
    });
    expect(result).toBe(44300);
  });
  it('should return the nearest strike number when atm strike is in between multiple trades', () => {
    const algoTrades: TradeDetails[] = [
      {
        optionType: 'CE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44300',
        token: '60481',
        symbol: 'BANKNIFTY31AUG2344300CE',
        closed: false,
        tradedPrice: 270,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344300CE',
      },
      {
        optionType: 'PE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44300',
        token: '60482',
        symbol: 'BANKNIFTY31AUG2344300PE',
        closed: false,
        tradedPrice: 242,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344300PE',
      },
      {
        optionType: 'CE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44100',
        token: '60477',
        symbol: 'BANKNIFTY31AUG2344100CE',
        closed: false,
        tradedPrice: 235,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344100CE',
      },
      {
        optionType: 'PE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44100',
        token: '60478',
        symbol: 'BANKNIFTY31AUG2344100PE',
        closed: false,
        tradedPrice: 295,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344100PE',
      },
      {
        optionType: 'CE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44500',
        token: '60477',
        symbol: 'BANKNIFTY31AUG2344100CE',
        closed: false,
        tradedPrice: 235,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344100CE',
      },
      {
        optionType: 'PE',
        netQty: '-15',
        expireDate: '31AUG2023',
        strike: '44500',
        token: '60478',
        symbol: 'BANKNIFTY31AUG2344100PE',
        closed: false,
        tradedPrice: 295,
        exchange: 'NFO',
        tradingSymbol: 'BANKNIFTY31AUG2344100PE',
      },
    ];
    const atmStrike = 44300;
    const result = getNearestStrike({
      algoTrades: algoTrades,
      atmStrike: atmStrike,
    });
    expect(result).toBe(44300);
  });
});
