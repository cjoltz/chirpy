import type { Request, Response } from "express";
import { config } from "../config.js";
import { deleteAllUsers } from "../db/queries/users.js";
import { ForbiddenError } from "./errors.js";

export async function handlerMetrics(_: Request, res: Response) {
  const num = config.api.fileserverHits;
  const html = `
  <html>
    <body>
      <h1>Welcome, Chirpy Admin</h1>
      <p>Chirpy has been visited ${num} times!</p>
    </body>
  </html>`;
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

export async function handlerReset(_: Request, res: Response) {
  if (config.api.platform !== "dev") {
    throw new ForbiddenError(
      "Invalid environment configuration for this endpoint",
    );
    return;
  }
  config.api.fileserverHits = 0;
  await deleteAllUsers();
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`Reset metrics and db`);
}
