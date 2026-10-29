import type { Request, Response } from "express";
import { BadRequestError, ConflictError, UnauthorizedError } from "./errors.js";
import { NewUser } from "../db/schema.js";
import { createUser, getUserByEmail } from "../db/queries/users.js";
import { respondWithJSON } from "./json.js";
import {
  ACCESS_TOKEN_LIFE,
  REFRESH_TOKEN_LIFE,
  checkPasswordHash,
  getBearerToken,
  hashPassword,
  makeJWT,
  makeRefreshToken,
  validateJWT,
} from "../auth.js";
import { config } from "../config.js";
import {
  createRefreshToken,
  getUserIdFromRefreshToken,
} from "../db/queries/tokens.js";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export async function handlerCreateUser(req: Request, res: Response) {
  type parameters = {
    email: string;
    password: string;
  };
  const params: parameters = req.body;

  if (
    typeof params?.email !== "string" ||
    typeof params?.password !== "string"
  ) {
    throw new BadRequestError("Invalid JSON format");
  }
  if (!isValidEmail(params.email)) {
    throw new BadRequestError("Invalid email");
  }

  const hash = await hashPassword(params.password);
  const user: NewUser = {
    email: params.email,
    hashedPassword: hash,
  };
  const secretUser = await createUser(user);
  if (!secretUser) {
    throw new ConflictError("User already exists");
  }
  const { hashedPassword: _, ...publicUser } = secretUser;

  respondWithJSON(res, 201, publicUser);
}

export async function handlerLogin(req: Request, res: Response) {
  type parameters = {
    email: string;
    password: string;
  };
  const params: parameters = req.body;
  if (
    typeof params?.email !== "string" ||
    typeof params?.password !== "string"
  ) {
    throw new BadRequestError("Invalid JSON");
  }

  const user = await getUserByEmail(params.email);
  if (!user) {
    throw new UnauthorizedError("incorrect email or password");
  }
  const isCorrectPassword = await checkPasswordHash(
    params.password,
    user.hashedPassword,
  );
  if (!isCorrectPassword) {
    throw new UnauthorizedError("incorrect email or password");
  }

  const { hashedPassword: _, ...publicUser } = user;
  const token = makeJWT(publicUser.id, ACCESS_TOKEN_LIFE, config.jwtSecret);
  const refreshToken = makeRefreshToken();
  await createRefreshToken(refreshToken, publicUser.id, REFRESH_TOKEN_LIFE);
  respondWithJSON(res, 200, { ...publicUser, token, refreshToken });
}

export async function handlerUpdateUser(req: Request, res: Response) {
  // Authenticate user
  const token = getBearerToken(req);
  const userId = validateJWT(token, config.jwtSecret);
  

  type parameters = {
    email: string;
    password: string;
  };
  const params: parameters = req.body;
  const isEmailUpdate =
    typeof params.email === "string" && isValidEmail(params.email);
  const isPasswordUpdate = typeof params.password === "string";
}
