import type { Request, Response } from "express";
import { respondWithJSON } from "./json.js";
import { ACCESS_TOKEN_LIFE, getBearerToken, makeJWT } from "../auth.js";
import {
  getUserIdFromRefreshToken,
  revokeRefreshToken,
} from "../db/queries/tokens.js";
import { UnauthorizedError } from "./errors.js";
import { config } from "../config.js";

export async function handlerRefreshToken(req: Request, res: Response) {
  const refreshToken = getBearerToken(req);
  const userId = await getUserIdFromRefreshToken(refreshToken);
  if (!userId) {
    throw new UnauthorizedError("Invalid refresh token");
  }
  const token = makeJWT(userId, ACCESS_TOKEN_LIFE, config.jwtSecret);
  respondWithJSON(res, 200, { token });
}

export async function handlerRevokeToken(req: Request, res: Response) {
  const refreshToken = getBearerToken(req);
  await revokeRefreshToken(refreshToken);
  res.status(204).send();
}
