import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

export function middlewareLogResponses(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.on("finish", () => {
    const statusCode = res.statusCode;
    if (statusCode >= 300) {
      console.log(
        `[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`,
      );
    }
  });
  next();
}

export function middlewareMetricsInc(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.on("finish", () => {
    config.fileserverHits++;
  });
  next();
}
