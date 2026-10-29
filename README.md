# Chirpy

A small Twitter-style REST API built with TypeScript, Express 5, PostgreSQL and Drizzle ORM. Users can sign up, log in, post short "chirps", and upgrade to a premium "Chirpy Red" membership through a payment-provider webhook.

## Features

- User accounts with Argon2-hashed passwords
- JWT access tokens (1 hour) and database-backed refresh tokens (60 days) that can be revoked
- Create, list, fetch and delete chirps, where only the author can delete a chirp
- A 140-character limit and a profanity filter on chirps
- Filtering chirps by author and sorting them by date
- A webhook for the Polka payment provider, secured with an API key
- Automatic database migrations on startup
- Admin metrics and a reset endpoint that only works in development

## Tech stack

| | |
|---|---|
| Runtime | Node.js 22 (see `.nvmrc`) |
| Language | TypeScript |
| Web framework | Express 5 |
| Database | PostgreSQL |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Auth | `jsonwebtoken`, `argon2` |
| Tests | Vitest |

## Getting started

### Prerequisites

- Node.js 22 (`nvm use` picks it up from `.nvmrc`)
- A running PostgreSQL server and an empty database for Chirpy

### Install

```bash
npm install
```

### Configure

Create a `.env` file in the project root. The server will not start if any of these variables is missing.

```env
DB_URL=postgres://user:password@localhost:5432/chirpy?sslmode=disable
PORT=8080
PLATFORM=dev
JWT_SECRET=<a long random string>
POLKA_KEY=<API key issued by Polka>
```

| Variable | Purpose |
|---|---|
| `DB_URL` | PostgreSQL connection string |
| `PORT` | The port the server listens on |
| `PLATFORM` | Set to `dev` to enable `POST /admin/reset`. Any other value disables it. |
| `JWT_SECRET` | The secret used to sign and verify access tokens |
| `POLKA_KEY` | The API key Polka must send to call the webhook |

You can generate a strong `JWT_SECRET` with `openssl rand -base64 64`.

### Run

```bash
npm run dev     # compile and start
# or
npm run build && npm start
```

Pending migrations in `src/db/migrations` are applied automatically on startup.

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run dev` | Build, then start |
| `npm test` | Run the Vitest test suite |
| `npm run generate` | Generate a new migration after changing `src/db/schema.ts` |
| `npm run migrate` | Apply migrations manually with drizzle-kit |

## Authentication

Endpoints that need authentication read the `Authorization` header:

| Scheme | Used by | Example |
|---|---|---|
| Access token (JWT) | Creating chirps, deleting chirps, updating the user | `Authorization: Bearer <token>` |
| Refresh token | `/api/refresh`, `/api/revoke` | `Authorization: Bearer <refreshToken>` |
| API key | The Polka webhook | `Authorization: ApiKey <POLKA_KEY>` |

`POST /api/login` returns both tokens. When the access token expires, send the refresh token to `POST /api/refresh` to get a new access token. Send it to `POST /api/revoke` to log out.

## API reference

Errors are returned as JSON in the form `{ "error": "<message>" }` with a matching status code.

### Health and admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Returns `OK` when the server is up |
| `GET` | `/admin/metrics` | An HTML page showing how many times the `/app` file server has been visited |
| `POST` | `/admin/reset` | Resets the hit counter and **deletes all users**. Their chirps and tokens are deleted with them. This only works when `PLATFORM=dev`, and returns 403 otherwise. |

### Users

#### `POST /api/users`: create a user

```json
{ "email": "user@example.com", "password": "hunter2" }
```

Returns `201` with the user. The password hash is never returned.

```json
{
  "id": "uuid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "email": "user@example.com",
  "isChirpyRed": false
}
```

Returns `400` for an invalid email or body and `409` if the email is already registered.

#### `POST /api/login`: log in

Uses the same body as creating a user. Returns `200` with the user object plus `token` (an access JWT that lasts 1 hour) and `refreshToken` (lasts 60 days). Returns `401` for a wrong email or password.

#### `PUT /api/users`: update email and password

Requires a `Bearer <access token>`. The body takes the new `email` and `password`, and both are required. Returns `200` with the updated user, `400` for invalid input, `401` for a missing or invalid token, and `409` if the email belongs to another user.

#### `POST /api/refresh`: get a new access token

Requires a `Bearer <refresh token>`. Returns `200` with `{ "token": "<new access JWT>" }`, or `401` if the refresh token is invalid, expired or revoked.

#### `POST /api/revoke`: revoke a refresh token

Requires a `Bearer <refresh token>`. Returns `204`.

### Chirps

#### `POST /api/chirps`: create a chirp

Requires a `Bearer <access token>`.

```json
{ "body": "Hello, Chirpy!" }
```

Returns `201` with the chirp (`id`, `createdAt`, `updatedAt`, `body`, `userId`). The author is taken from the token. A body longer than 140 characters is rejected with `400`. The words *kerfuffle*, *sharbert* and *fornax* are replaced with `****`.

#### `GET /api/chirps`: list chirps

| Query parameter | Description |
|---|---|
| `authorId` | Only return chirps written by this user ID |
| `sort` | `asc` (the default) or `desc`, ordered by creation time |

Example: `GET /api/chirps?authorId=<uuid>&sort=desc`

#### `GET /api/chirps/:chirpId`: get one chirp

Returns `200` with the chirp, or `404` if it doesn't exist.

#### `DELETE /api/chirps/:chirpId`: delete a chirp

Requires a `Bearer <access token>`. Returns `204` on success, `403` if the chirp belongs to someone else, and `404` if it doesn't exist.

### Webhooks

#### `POST /api/polka/webhooks`: Chirpy Red upgrades

Requires `ApiKey <POLKA_KEY>`.

```json
{ "event": "user.upgraded", "data": { "userId": "uuid" } }
```

Sets `isChirpyRed` to `true` for that user and returns `204`. Other event types are acknowledged with `204` and ignored. Returns `401` for a missing or wrong API key and `404` if the user doesn't exist.

## Project structure

```
src/
├── index.ts            # App setup, middleware, routes, startup migrations
├── config.ts           # Loads and validates environment variables
├── auth.ts             # Password hashing, JWTs, refresh tokens, header parsing
├── auth.test.ts        # Vitest tests for auth helpers
├── api/                # Route handlers, error classes, JSON helpers, middleware
├── app/                # Static frontend served at /app
└── db/
    ├── schema.ts       # Drizzle table definitions (users, chirps, refresh_tokens)
    ├── queries/        # Database query functions
    └── migrations/     # SQL migrations generated by drizzle-kit
```

## Database schema

- **users**: `id`, `email` (unique), `hashed_password`, `is_chirpy_red`, `created_at`, `updated_at`
- **chirps**: `id`, `body`, `user_id` (references users, deleted with the user), `created_at`, `updated_at`
- **refresh_tokens**: `token` (primary key), `user_id` (references users, deleted with the user), `expires_at`, `revoked_at`, `created_at`, `updated_at`

To change the schema, edit `src/db/schema.ts`, run `npm run generate`, and commit the new migration. It will be applied the next time the server starts.
