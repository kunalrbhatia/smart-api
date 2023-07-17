export const getNextExpiry = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilThursday = 4 - dayOfWeek;
  const comingThursday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysUntilThursday
  );
  // Get the year, month, and day of the coming Thursday
  const year = comingThursday.getFullYear();
  const month = comingThursday.getMonth() + 1;
  const day = comingThursday.getDate();

  // Format the date as ddmmmyyyy
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const monthName = months[month - 1];
  const formattedDate = `${day}${monthName}${year}`;
  return formattedDate;
};
