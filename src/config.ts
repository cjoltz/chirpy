import type { MigrationConfig } from "drizzle-orm/migrator";

process.loadEnvFile();

export type Config = {
  api: APIConfig;
  db: DBConfig;
  jwtSecret: string;
};

export type APIConfig = {
  fileserverHits: number;
  port: number;
  platform: string;
};

export type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

export const config: Config = {
  api: {
    fileserverHits: 0,
    port: (function () {
      const port = parseInt(envOrThrow("PORT"));
      if (!port) {
        throw new Error("Invalid configuration for port");
      }
      return port;
    })(),
    platform: envOrThrow("PLATFORM"),
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig,
  },
  jwtSecret: envOrThrow("JWT_SECRET"),
};

function envOrThrow(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Environment variable ${key} not found`);
  }
  return val;
}
