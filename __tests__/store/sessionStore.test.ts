import fs from 'fs';
import path from 'path';
import {
  getSessionState,
  saveSessionState,
  setStraddleOpenedToday,
  setMtmBaseline,
} from '../../src/store/sessionStore';

const SESSION_FILE = path.join(process.cwd(), 'session.json');

describe('SessionStore', () => {
  beforeEach(() => {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  });

  it('should return default values when session.json does not exist', () => {
    const state = getSessionState();
    expect(state).toEqual({
      tradingDate: '',
      straddleOpenedToday: false,
      mtmBaseline: 0,
    });
  });

  it('should persist straddleOpenedToday and survive process/file reads', () => {
    setStraddleOpenedToday('04AUG2026');
    const state = getSessionState('04AUG2026');
    expect(state.straddleOpenedToday).toBe(true);
    expect(state.tradingDate).toBe('04AUG2026');
  });

  it('should reset session state when a new expiry date is encountered', () => {
    setStraddleOpenedToday('04AUG2026');
    setMtmBaseline('04AUG2026', 1500);

    const newState = getSessionState('11AUG2026');
    expect(newState.straddleOpenedToday).toBe(false);
    expect(newState.mtmBaseline).toBe(0);
    expect(newState.tradingDate).toBe('11AUG2026');
  });

  it('should persist MTM baseline correctly', () => {
    setMtmBaseline('04AUG2026', 2500);
    const state = getSessionState('04AUG2026');
    expect(state.mtmBaseline).toBe(2500);
  });
});
