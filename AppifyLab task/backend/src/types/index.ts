// Example type definition
export interface Config {
  apiUrl: string;
  apiKey: string;
}

export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};