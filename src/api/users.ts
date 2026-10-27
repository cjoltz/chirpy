import type { Request, Response } from "express";
import { BadRequestError, ConflictError, UnauthorizedError } from "./errors.js";
import { NewUser } from "../db/schema.js";
import { createUser, getUserByEmail } from "../db/queries/users.js";
import { respondWithJSON } from "./json.js";
import { checkPasswordHash, hashPassword, makeJWT } from "../auth.js";
import { config } from "../config.js";

export async function handlerCreateUser(req: Request, res: Response) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  type parameters = {
    email: string;
    password: string;
  };
  let params: parameters = req.body;

  if (
    typeof params?.email !== "string" ||
    typeof params?.password !== "string"
  ) {
    throw new BadRequestError("Invalid JSON format");
  }
  if (!emailRegex.test(params.email)) {
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
    expiresInSeconds: number;
  };
  const params: parameters = req.body;
  if (
    typeof params?.email !== "string" ||
    typeof params?.password !== "string"
  ) {
    throw new BadRequestError("Invalid JSON");
  }
  // default to 1 hour if invalid value (<=0, >1hr, or undefined)
  const tokenDuration =
    typeof params.expiresInSeconds !== "number" ||
    params.expiresInSeconds > 3600 ||
    params.expiresInSeconds <= 0
      ? 3600
      : params.expiresInSeconds;

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
  const token = makeJWT(publicUser.id, tokenDuration, config.jwtSecret);
  respondWithJSON(res, 200, { ...publicUser, token });
}
