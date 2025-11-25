// Example utility function
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const isNonEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};