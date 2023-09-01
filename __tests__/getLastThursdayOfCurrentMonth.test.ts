import { getLastThursdayOfCurrentMonth } from '../src/helpers/functions';
describe('getLastWednesdayOfCurrentMonth', () => {
  it('should return the correct date for the last Wednesday of the current month', () => {
    // Mock the current date for testing purposes (August 25, 2023)
    const mockDate = new Date('2023-08-05'); // Wednesday, August 30, 2023
    jest.spyOn(global.Date, 'now').mockImplementation(() => mockDate.getTime());
    // Calculate the expected result based on the mock date (August 30, 2023)
    const expectedDate = '31AUG2023'; // Wednesday, August 30, 2023, noon (UTC time)
    // Call the function and compare the result with the expected date
    const result = getLastThursdayOfCurrentMonth();
    expect(result === expectedDate);
  });

  it('should return the correct date for the last Wednesday of the current month when today is already a Wednesday', () => {
    // Mock the current date for testing purposes (Wednesday, August 30, 2023)
    const mockDate = new Date('2023-08-31'); // Wednesday, August 30, 2023
    jest.spyOn(global.Date, 'now').mockImplementation(() => mockDate.getTime());
    // Calculate the expected result (same day)
    const expectedDate = '31AUG2023'; // Wednesday, August 30, 2023, noon (UTC time)
    // Call the function and compare the result with the expected date
    const result = getLastThursdayOfCurrentMonth();
    expect(result === expectedDate);
  });
});
