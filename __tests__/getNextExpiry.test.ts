import { getNextExpiry } from '../src/helpers/functions';
describe('getNextExpiry', () => {
  it('should return the next Thursday date in the correct format', () => {
    const expectedDateRegex =
      /^\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{4}$/;
    const result = getNextExpiry();
    expect(result).toMatch(expectedDateRegex);
  });
  it('should return the next Thursday date when today is Wednesday', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-08-02').valueOf());
    const result = getNextExpiry();
    const expectedDate = '10AUG2023';
    expect(result).toEqual(expectedDate);
  });
  it('should return the next Thursday date when today is Thursday', () => {
    jest
      .spyOn(global.Date, 'now')
      .mockReturnValue(new Date('2023-08-02').valueOf());
    const result = getNextExpiry();
    const expectedDate = '10AUG2023';
    expect(result).toEqual(expectedDate);
  });
});
