import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errorHandler';

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`) as CustomError;
  error.statusCode = 404;
  next(error);
};