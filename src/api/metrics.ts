import type { Request, Response } from "express";
import { config } from "../config.js";

export async function handlerMetrics(_: Request, res: Response) {
  const num = config.fileserverHits;
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
  config.fileserverHits = 0;
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`Reset metrics`);
}
