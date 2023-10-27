import { getNextExpiry } from '../src/helpers/functions';
describe('getNextExpiry', () => {
  it('should return the next Wednesday date in the correct format', () => {
    const expectedDateRegex =
      /^\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{4}$/;
    const result = getNextExpiry();
    expect(result).toMatch(expectedDateRegex);
  });
  it('should return the next Wednesday date', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-10-27').valueOf());
    const result = getNextExpiry();
    const expectedDate = '01NOV2023';
    expect(result).toEqual(expectedDate);
  });
  it('should return the next Wednesday date when today is Wednesday', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-08-02').valueOf());
    const result = getNextExpiry();
    const expectedDate = '02AUG2023';
    expect(result).toEqual(expectedDate);
  });
  it('should return the next Wednesday date when today is one day before Wednesday', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-08-01').valueOf());
    const result = getNextExpiry();
    const expectedDate = '09AUG2023';
    expect(result).toEqual(expectedDate);
  });
  it('should return the next Thursday date when today last Monday', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-08-28').valueOf());
    const result = getNextExpiry();
    const expectedDate = '31AUG2023';
    expect(result).toEqual(expectedDate);
  });
  it('should return the next Thursday date when today last Monday', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-10-24').valueOf());
    const result = getNextExpiry();
    const expectedDate = '26OCT2023';
    expect(result).toEqual(expectedDate);
  });
  it('should return the next month first Thursday date when today the day after last Thursday', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-10-27').valueOf());
    const result = getNextExpiry();
    const expectedDate = '01NOV2023';
    expect(result).toEqual(expectedDate);
  });
  it('should return the same date when it is last Thursday', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-10-26').valueOf());
    const result = getNextExpiry();
    const expectedDate = '26OCT2023';
    expect(result).toEqual(expectedDate);
  });
});
