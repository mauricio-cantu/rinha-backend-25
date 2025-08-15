export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const runWithInterval = async (
  callback: () => Promise<unknown>,
  intervalInMs: number
) => {
  while (true) {
    await callback();
    await delay(intervalInMs);
  }
};

export const isDateInRange = (
  date: string,
  fromDate: string,
  toDate: string
) => {
  const dateToCheck = new Date(date);
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return dateToCheck >= from && dateToCheck <= to;
};
