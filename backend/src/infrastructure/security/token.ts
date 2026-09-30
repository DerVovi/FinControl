import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';

export interface UserTokenPayload {
  sub: string;
  email: string;
}

export class TokenService {
  public static generateAccessToken(payload: UserTokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    });
  }

  public static verifyAccessToken(token: string): UserTokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as UserTokenPayload;
  }

  public static generateRefreshToken(): { token: string; hash: string } {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { token: rawToken, hash };
  }

  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
