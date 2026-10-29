import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { UnauthorizedError } from "./api/errors.js";
import type { Request } from "express";
import { randomBytes } from "node:crypto";

const TOKEN_ISSUER = "chirpy";
export const ACCESS_TOKEN_LIFE = 60 * 60; // 1 hour, in seconds
export const REFRESH_TOKEN_LIFE = 60 * 24 * 60 * 60; // 60 days, in seconds

export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await argon2.hash(password);
    return hash;
  } catch (e) {
    throw new Error(`An error occured`, { cause: e });
  }
}

export async function checkPasswordHash(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    const isMatch = await argon2.verify(hash, password);
    return isMatch;
  } catch (e) {
    throw new Error("An error ocurred", { cause: e });
  }
}

export function makeJWT(
  userId: string,
  expiresIn: number,
  secret: string,
): string {
  // expiresIn must be provided in seconds
  type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

  const iss = TOKEN_ISSUER; // issuer
  const sub = userId; // subject
  const iat = Math.floor(Date.now() / 1000); // issued at
  const exp = iat + expiresIn; // expires at
  const load: payload = { iss, sub, iat, exp };

  return jwt.sign(load, secret);
}

export function validateJWT(tokenString: string, secret: string): string {
  try {
    const decoded = jwt.verify(tokenString, secret, { issuer: TOKEN_ISSUER });
    const user = decoded.sub;
    if (typeof user !== "string") {
      throw new Error("No subject");
    }
    return user;
  } catch {
    throw new UnauthorizedError("Invalid token");
  }
}

export function getBearerToken(req: Request): string {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    throw new UnauthorizedError("Request Missing Authorization Header");
  }

  const [scheme, tokenString, ...rest] = authHeader.trim().split(/\s+/);
  if (scheme.toLowerCase() !== "bearer" || !tokenString || rest.length > 0) {
    throw new UnauthorizedError("Malformed Authorization Header");
  }
  return tokenString;
}

export function makeRefreshToken(): string {
  return randomBytes(32).toString("hex");
}
