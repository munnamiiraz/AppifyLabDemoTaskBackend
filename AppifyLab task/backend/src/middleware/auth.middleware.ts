import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import getPrisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {

    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json(new ApiError(401, 'You are not logged in. Please log in to get access.'));
      return;
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string };

    // 3) Check if user still exists
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      res.status(401).json(new ApiError(401, 'The user belonging to this token no longer exists.'));
      return;
    }

    // 4) Grant access to protected route
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json(new ApiError(401, 'Invalid token. Please log in again.'));
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) {
      res.status(403).json(new ApiError(403, 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
};