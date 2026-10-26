import express from "express";
import { handlerReadiness } from "./api/readiness.js";
import { middlewareLogResponses } from "./api/middleware.js";

async function main() {
  const app = express();
  const PORT = 8080;

  // App-Level Middleware
  app.use(middlewareLogResponses);

  // Static files
  app.use("/app", express.static("./src/app"));
  // Readiness Endpoint
  app.get("/healthz", handlerReadiness);

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

main();
