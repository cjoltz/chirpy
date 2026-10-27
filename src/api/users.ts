import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "./errors.js";
import { NewUser, NewUserNoPassword } from "../db/schema.js";
import { createUser, getUserByEmail } from "../db/queries/users.js";
import { respondWithJSON } from "./json.js";
import { checkPasswordHash, hashPassword } from "../auth.js";

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
  const { hashedPassword: _, ...publicUser } = await createUser(user);

  respondWithJSON(res, 201, publicUser);
}

export async function handlerLogin(req: Request, res: Response) {
  type parameters = {
    email: string;
    password: string;
  };
  let params: parameters = req.body;
  if (typeof params.email !== "string" || typeof params.password !== "string") {
    throw new BadRequestError("Invalid JSON");
  }

  const user = await getUserByEmail(params.email);
  const isCorrectPassword = await checkPasswordHash(
    params.password,
    user.hashedPassword,
  );
  if (!isCorrectPassword) {
    throw new UnauthorizedError("incorrect email or password");
  }
  const { hashedPassword: _, ...publicUser } = user;
  respondWithJSON(res, 200, publicUser);
}
