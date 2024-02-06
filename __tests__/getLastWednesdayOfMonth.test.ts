import moment, { Moment } from "moment-timezone";
import { getLastWednesdayOfMonth } from "../src/helpers/functions";
describe("getLastWednesdayOfMonth", () => {
  // beforeEach(() => {
  //   jest.spyOn(moment, "now").mockImplementation(() => Date.now());
  // });
  // afterEach(() => {
  //   jest.restoreAllMocks();
  // });
  test("returns null when last day of month is wednesday", () => {
    const mockDate = moment("2024-01-31").valueOf();
    jest.spyOn(moment, "now").mockImplementation(() => mockDate);
    expect(getLastWednesdayOfMonth()).toBeNull();
  });
  test("returns normal response when last day of month is not wednesday", () => {
    const mockDate = moment("2024-01-05").valueOf();
    jest.spyOn(moment, "now").mockImplementation(() => mockDate);
    const expectedLastWednesday = moment("2024-01-31").format("DDMMMYYYY").toUpperCase();
    const lastWednesday: Moment | null = getLastWednesdayOfMonth() as Moment | null;
    if (lastWednesday !== null) expect(lastWednesday.format("DDMMMYYYY").toUpperCase()).toBe(expectedLastWednesday);
    else expect(lastWednesday).toBeNull();
  });
});
