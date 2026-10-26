import type { Request, Response } from "express";
import { BadRequestError } from "./errors.js";
import { NewUser } from "../db/schema.js";
import { createUser } from "../db/queries/users.js";
import { respondWithJSON } from "./json.js";

export async function handlerCreateUser(req: Request, res: Response) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  type parameters = {
    email: string;
  };
  let params: parameters = req.body;

  if (typeof params?.email !== "string") {
    throw new BadRequestError("Invalid JSON format");
  }
  if (!emailRegex.test(params.email)) {
    throw new BadRequestError("Invalid email");
  }
  const user: NewUser = {
    email: params.email,
  };
  const newUser = await createUser(user);
  respondWithJSON(res, 201, {
    id: newUser.id,
    email: newUser.email,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  });
}
