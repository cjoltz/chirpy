import express from "express";
import { handlerReadiness } from "./api/readiness.js";
import {
  errorHandler,
  middlewareLogResponses,
  middlewareMetricsInc,
} from "./api/middleware.js";
import { handlerMetrics, handlerReset } from "./api/metrics.js";
import {
  handlerCreateChirp,
  handlerGetChirps,
  handlerGetChirp,
  handlerDeleteChirp,
} from "./api/chirps.js";
import {
  handlerCreateUser,
  handlerLogin,
  handlerUpdateUser,
  handlerUpgradeToRed,
} from "./api/users.js";
import { config } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { handlerRefreshToken, handlerRevokeToken } from "./api/tokens.js";

async function main() {
  // Migrations
  const migrationClient = postgres(config.db.url, { max: 1 });
  await migrate(drizzle(migrationClient), config.db.migrationConfig);

  // Create app
  const app = express();

  // App-Level Middleware
  app.use(middlewareLogResponses, express.json());

  // Static files
  app.use("/app", middlewareMetricsInc, express.static("./src/app"));

  // Readiness Endpoint
  app.get("/api/healthz", handlerReadiness);

  // Admin endpoints
  app.get("/admin/metrics", handlerMetrics);
  app.post("/admin/reset", handlerReset);

  // User endpoints
  app.post("/api/users", handlerCreateUser);
  app.post("/api/login", handlerLogin);
  app.post("/api/refresh", handlerRefreshToken);
  app.post("/api/revoke", handlerRevokeToken);
  app.put("/api/users", handlerUpdateUser);
  app.post("/api/polka/webhooks", handlerUpgradeToRed);

  // Chirp endpoints
  app.post("/api/chirps", handlerCreateChirp);
  app.get("/api/chirps", handlerGetChirps);
  app.get("/api/chirps/:chirpId", handlerGetChirp);
  app.delete("/api/chirps/:chirpId", handlerDeleteChirp);

  // Error Handling middleware (MUST BE LAST, RIGHT BEFORE .listen)
  app.use(errorHandler);

  app.listen(config.api.port, () => {
    console.log(`Server is running at http://localhost:${config.api.port}`);
  });
}

main();
