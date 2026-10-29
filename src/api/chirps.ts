import type { Request, Response } from "express";
import { respondWithJSON } from "./json.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "./errors.js";
import type { NewChirp } from "../db/schema.js";
import {
  createChirp,
  deleteChirp,
  getAllChirps,
  getChirpById,
} from "../db/queries/chirps.js";
import { getBearerToken, validateJWT } from "../auth.js";
import { config } from "../config.js";

const profanities = ["kerfuffle", "sharbert", "fornax"];
const maxChirpLength = 140;

function validateChirp(chirp: string): string {
  if (typeof chirp !== "string") {
    throw new BadRequestError("Invalid JSON format");
  }
  if (chirp.length > maxChirpLength) {
    throw new BadRequestError(
      `Chirp is too long. Max length is ${maxChirpLength}`,
    );
  }

  const words = chirp.split(" ");

  const cleaned = words.map((word) =>
    profanities.includes(word.toLowerCase()) ? "****" : word,
  );

  return cleaned.join(" ");
}

export async function handlerCreateChirp(req: Request, res: Response) {
  // Authentication
  const token = getBearerToken(req);
  const userId = validateJWT(token, config.jwtSecret);

  type parameters = {
    body: string;
  };
  const params: parameters = req.body;

  const cleanChirp = validateChirp(params?.body);

  const chirp: NewChirp = {
    body: cleanChirp,
    userId,
  };

  const result = await createChirp(chirp);
  if (!result) {
    throw new Error("Failed to create chirp");
  }

  respondWithJSON(res, 201, {
    id: result.id,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    body: result.body,
    userId: result.userId,
  });
}

export async function handlerGetChirps(_req: Request, res: Response) {
  const chirps = await getAllChirps();
  respondWithJSON(res, 200, chirps);
}

export async function handlerGetChirp(req: Request, res: Response) {
  const id = req.params["chirpId"];
  if (typeof id !== "string") {
    throw new NotFoundError("Can't find chirp");
  }
  const chirp = await getChirpById(id);
  if (!chirp) {
    throw new NotFoundError("Chirp not found");
  }
  respondWithJSON(res, 200, chirp);
}

export async function handlerDeleteChirp(req: Request, res: Response) {
  // Authenticate user
  const token = getBearerToken(req);
  const userId = validateJWT(token, config.jwtSecret);

  const chirpId = req.params["chirpId"];
  if (typeof chirpId !== "string") {
    throw new NotFoundError("Can't find chirp");
  }

  // See if chirp exists
  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    throw new NotFoundError("Can't find chirp");
  }

  // Authorization, does chirp belong to authenticated user
  if (chirp.userId !== userId) {
    throw new ForbiddenError("Go delete a chirp of your own");
  }

  // Delete chirp
  await deleteChirp(chirpId);
  res.status(204).send();
}
