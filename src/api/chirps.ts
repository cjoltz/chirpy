import type { Request, Response } from "express";
import { respondWithJSON } from "./json.js";
import { BadRequestError, NotFoundError } from "./errors.js";
import type { NewChirp } from "../db/schema.js";
import {
  createChirp,
  getAllChirps,
  getChirpById,
} from "../db/queries/chirps.js";

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
  type parameters = {
    body: string;
    userId: string;
  };
  const params: parameters = req.body;
  const cleanChirp = validateChirp(params.body);

  // May need to update user check in the future to determine if user is registered
  if (!params.userId) {
    throw new BadRequestError("Unknown User");
  }

  const chirp: NewChirp = {
    body: cleanChirp,
    userId: params.userId,
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
