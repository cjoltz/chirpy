import express from "express";
import { handlerReadiness } from "./api/readiness.js";
import {
  middlewareLogResponses,
  middlewareMetricsInc,
} from "./api/middleware.js";
import { handlerMetrics, handlerReset } from "./api/metrics.js";
import { handlerChirpValidate } from "./api/chirps.js";

async function main() {
  const app = express();
  const PORT = 8080;

  // App-Level Middleware
  app.use(middlewareLogResponses);

  // Static files
  app.use("/app", middlewareMetricsInc, express.static("./src/app"));

  // Readiness Endpoint
  app.get("/api/healthz", handlerReadiness);
  app.post("/api/validate_chirp", handlerChirpValidate);

  // Admin endpoints
  app.get("/admin/metrics", handlerMetrics);
  app.post("/admin/reset", handlerReset);

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

main();
