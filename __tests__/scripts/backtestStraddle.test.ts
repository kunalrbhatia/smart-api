import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('backtest-straddle script parameterization', () => {
  const scriptPath = path.resolve(
    __dirname,
    '../../scripts/backtest-straddle.mjs',
  );
  let tmpDataDir: string;

  beforeAll(() => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-test-data-'));
    const dummyDateDir = path.join(tmpDataDir, '2026-08-20');
    fs.mkdirSync(dummyDateDir, { recursive: true });
    const dummyFile = path.join(dummyDateDir, '20AUG2026_0915.json');
    fs.writeFileSync(
      dummyFile,
      JSON.stringify({
        expiry_date: '20AUG2026',
        snapshot_time: '2026-08-20T09:15:00Z',
        index_close: 80000,
        rows: [
          { strike_price: '80000', calls_ltp: '100', puts_ltp: '100' },
          { strike_price: '81500', calls_ltp: '10', puts_ltp: '500' },
          { strike_price: '78500', calls_ltp: '500', puts_ltp: '10' },
        ],
      }),
    );
  });

  afterAll(() => {
    if (tmpDataDir && fs.existsSync(tmpDataDir)) {
      fs.rmSync(tmpDataDir, { recursive: true, force: true });
    }
  });

  it('should print SENSEX index profile header when called with --index sensex', () => {
    const output = execSync(
      `node "${scriptPath}" --index sensex --data-dir "${tmpDataDir}"`,
      {
        encoding: 'utf8',
      },
    );
    expect(output).toContain('SENSEX OPTION CHAIN BACKTEST');
    expect(output).toContain('Index      : SENSEX');
    expect(output).toContain('Lot size   : 20');
    expect(output).toContain('hedgeVariance 1500');
    expect(output).toContain('strikeDiff 200');
  });

  it('should print NIFTY index profile header by default', () => {
    const output = execSync(`node "${scriptPath}" --data-dir "${tmpDataDir}"`, {
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
      `node "${scriptPath}" --index sensex --data-dir "${tmpDataDir}" --lot-size 25 --hedge-variance 1200 --strike-diff 250`,
      {
        encoding: 'utf8',
      },
    );
    expect(output).toContain('Lot size   : 25');
    expect(output).toContain('hedgeVariance 1200');
    expect(output).toContain('strikeDiff 250');
  });
});
