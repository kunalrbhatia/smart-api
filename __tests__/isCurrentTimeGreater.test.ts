import { isCurrentTimeGreater } from '../src/helpers/functions';
const mockDateNow = (isoDate: string) => {
  const dateNow = jest.spyOn(Date, 'now');
  dateNow.mockImplementation(() => new Date(isoDate).getTime());
};
describe('isCurrentTimeGreater function', () => {
  beforeAll(() => {
    mockDateNow('2023-08-24T15:22:00Z');
  });
  it('should return false when current time is equal to the provided target time', () => {
    const targetTime = { hours: 20, minutes: 52 };
    expect(isCurrentTimeGreater(targetTime)).toBe(false);
  });
  it('should return false when current time is before than the provided target time', () => {
    const targetTime = { hours: 21, minutes: 22 };
    expect(isCurrentTimeGreater(targetTime)).toBe(false);
  });
  it('should return true when current time is less than the provided target time', () => {
    const targetTime = { hours: 8, minutes: 45 };
    expect(isCurrentTimeGreater(targetTime)).toBe(true);
  });
  it('should return false when current time is midnight (00:00)', () => {
    mockDateNow('2023-08-24T00:00:00Z');
    const targetTime = { hours: 21, minutes: 22 };
    expect(isCurrentTimeGreater(targetTime)).toBe(false);
  });
  it('should return false when target time is midnight (00:00)', () => {
    const targetTime = { hours: 15, minutes: 30 };
    expect(isCurrentTimeGreater(targetTime)).toBe(false);
  });
});
