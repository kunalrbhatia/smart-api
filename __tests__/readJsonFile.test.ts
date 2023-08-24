import fs from 'fs';
import { readJsonFile, getCurrentDate } from '../src/helpers/functions';
import { ALGO } from '../src/helpers/constants';
import { JsonFileStructure } from '../src/app.interface';
jest.mock('fs', () => {
  return { readFileSync: jest.fn() };
});
jest.mock('../src/helpers/functions', () => {
  return {
    getCurrentDate: jest.fn().mockReturnValue('2023-08-25'),
    readJsonFile: jest
      .fn()
      .mockReturnValue({ key: 'value' })
      .mockImplementation(() => {
        try {
          const currentDate = getCurrentDate();
          const fileName = `${currentDate}_trades.json`;
          console.log(`${ALGO}: reading from json file with name ${fileName}`);
          const dataFromFile = fs.readFileSync(fileName, 'utf-8');
          const dataFromFileJson: JsonFileStructure = JSON.parse(dataFromFile);
          return dataFromFileJson;
        } catch (error) {
          console.log(`${ALGO}: Error reading from json file`);
          console.log(error);
          throw error;
        }
      }),
  };
});
test('Reads a valid JSON file', () => {
  // Mock the necessary functions and dependencies
  const currentDate = '2023-08-25';
  const mockFileName = `${currentDate}_trades.json`;
  const mockData = '{"key": "value"}';

  // Use jest.spyOn to mock fs.readFileSync
  const readFileSyncMock = jest.spyOn(fs, 'readFileSync');
  readFileSyncMock.mockReturnValue(mockData);

  const parseSpy = jest.spyOn(JSON, 'parse');
  parseSpy.mockReturnValue(JSON.parse(mockData));

  // Call the function
  const result = readJsonFile();

  // Assertions
  expect(result).toEqual({ key: 'value' });
  expect(getCurrentDate).toHaveBeenCalled();
  expect(fs.readFileSync).toHaveBeenCalledWith(mockFileName, 'utf-8');
  expect(JSON.parse).toHaveBeenCalledWith(mockData);
  parseSpy.mockRestore();
});

test('Constructs the correct file name', () => {
  const currentDate = '2023-08-25';
  // Call the function
  readJsonFile();
  // Assertion
  expect(fs.readFileSync).toHaveBeenCalledWith(
    `${currentDate}_trades.json`,
    'utf-8'
  );
});
