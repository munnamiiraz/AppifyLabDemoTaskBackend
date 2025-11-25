import jwt from 'jsonwebtoken';
import type { JwtPayload, Secret } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
}

export const generateToken = (userId: string, email: string): string => {
  const payload: TokenPayload = {
    id: userId,
    email: email,
  };

  return jwt.sign(payload, JWT_SECRET as Secret, {
    expiresIn: '7d'
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};