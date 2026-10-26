import type { Request, Response } from "express";
import { respondWithError, respondWithJSON } from "./json.js";

export async function handlerChirpValidate(req: Request, res: Response) {
  type parameters = {
    body: string;
  };
  let body = "";

  // Receive input data
  req.on("data", (chunk) => {
    body += chunk;
  });

  let params: parameters;
  // Listen for end events
  req.on("end", () => {
    try {
      params = JSON.parse(body);
    } catch (err) {
      respondWithError(res, 400, "Invalid JSON");
      return;
    }
    const maxChirpLength = 140;
    if (typeof params?.body !== "string") {
      respondWithError(res, 400, "Invalid JSON request");
      return;
    }
    if (params.body.length > maxChirpLength) {
      respondWithError(res, 400, "Chirp is too long");
      return;
    }

    respondWithJSON(res, 200, { valid: true });
  });
}
