import type { Request, Response } from "express";
import { respondWithError, respondWithJSON } from "./json.js";

const profanities = ["kerfuffle", "sharbert", "fornax"];
const maxChirpLength = 140;

export async function handlerChirpValidate(req: Request, res: Response) {
  type parameters = {
    body: string;
  };

  let params: parameters = req.body;

  if (typeof params?.body !== "string") {
    respondWithError(res, 400, "Invalid JSON request");
    return;
  }
  if (params.body.length > maxChirpLength) {
    respondWithError(res, 400, "Chirp is too long");
    return;
  }

  const words = params.body.split(" ");

  const cleaned = words.map((word) =>
    profanities.includes(word.toLowerCase()) ? "****" : word,
  );

  const cleanedBody = cleaned.join(" ");

  respondWithJSON(res, 200, { cleanedBody });
}
