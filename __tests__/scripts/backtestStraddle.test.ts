import { execSync } from 'child_process';
import path from 'path';

describe('backtest-straddle script parameterization', () => {
  const scriptPath = path.resolve(
    __dirname,
    '../../scripts/backtest-straddle.mjs',
  );

  it('should print SENSEX index profile header when called with --index sensex', () => {
    const output = execSync(`node "${scriptPath}" --index sensex`, {
      encoding: 'utf8',
    });
    expect(output).toContain('SENSEX OPTION CHAIN BACKTEST');
    expect(output).toContain('Index      : SENSEX');
    expect(output).toContain('Lot size   : 20');
    expect(output).toContain('hedgeVariance 1500');
    expect(output).toContain('strikeDiff 200');
  });

  it('should print NIFTY index profile header by default', () => {
    const output = execSync(`node "${scriptPath}"`, {
      encoding: 'utf8',
    });
    expect(output).toContain('NIFTY OPTION CHAIN BACKTEST');
    expect(output).toContain('Index      : NIFTY');
    expect(output).toContain('Lot size   : 65');
    expect(output).toContain('hedgeVariance 500');
    expect(output).toContain('strikeDiff 50');
  });

  it('should allow CLI overrides for lot size, hedge variance, and strike diff', () => {
    const output = execSync(
      `node "${scriptPath}" --index sensex --lot-size 25 --hedge-variance 1200 --strike-diff 250`,
      {
        encoding: 'utf8',
      },
    );
    expect(output).toContain('Lot size   : 25');
    expect(output).toContain('hedgeVariance 1200');
    expect(output).toContain('strikeDiff 250');
  });
});
