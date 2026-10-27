# Vitest Crash Course (for Chirpy's auth functions)

> Open this in VS Code with **Ctrl+Shift+V** (Markdown preview) for the nicest reading view.

## Contents

1. [Structure](#1-structure)
2. [Assertions (matchers)](#2-assertions-matchers)
3. [Testing errors](#3-testing-errors)
4. [Async tests and hooks](#4-async-tests-and-hooks)
5. [Controlling time (expiration tests)](#5-controlling-time-expiration-tests)
6. [Building "bad" inputs yourself](#6-building-bad-inputs-yourself)
7. [Running tests](#7-running-tests)
8. [Checklist: testing the auth functions](#8-checklist-testing-the-auth-functions)
9. [Gotchas cheat sheet](#9-gotchas-cheat-sheet)
10. [Side note: test files in the build](#10-side-note-test-files-in-the-build)
11. [Advanced topics (for later)](#11-advanced-topics-for-later)

---

## 1. Structure

```ts
import { describe, it, expect } from "vitest";

describe("makeJWT", () => {                         // groups related tests
  it("returns a string with 3 parts", () => {       // one behavior per test
    // Arrange: set up inputs
    const token = makeJWT("user-1", 60, "secret");  // Act: call the code
    expect(token.split(".")).toHaveLength(3);       // Assert: check the result
  });
});
```

- `describe` groups tests and can be nested. `it` and `test` are the same thing.
- Any file matching `*.test.ts` is picked up automatically.
- **One behavior per test.** Name tests after the behavior ("rejects an expired token"), not the implementation. When a test fails, its name should tell you what broke.
- **Arrange → Act → Assert** is the shape of almost every test.

---

## 2. Assertions (matchers)

| Matcher | Use for |
|---|---|
| `expect(x).toBe(true)` | Strict equality (`===`) for primitives: strings, numbers, booleans |
| `expect(obj).toEqual({ a: 1 })` | Deep equality for objects and arrays |
| `expect(str).toMatch(/^\$argon2/)` | Regex or substring match |
| `expect(arr).toHaveLength(3)` | Length of arrays or strings |
| `expect(x).toBeDefined()` | Value is not `undefined` |
| `expect(x).toBeTypeOf("string")` | `typeof` check |
| `expect(a).not.toBe(b)` | `.not` flips any matcher |

> **`toBe` vs `toEqual`:** two separate objects with the same contents are `toEqual` but **not** `toBe`. Use `toBe` for primitives and `toEqual` for objects.

---

## 3. Testing errors

This is the part you'll use most for auth, and it has one gotcha.

### Sync functions: pass a *function* to `expect`

```ts
// ✅ expect calls the function itself and catches the throw
expect(() => validateJWT("garbage", "secret")).toThrow(UnauthorizedError);

// ❌ validateJWT throws BEFORE expect runs, so the test crashes instead of passing
expect(validateJWT("garbage", "secret")).toThrow();
```

`toThrow` accepts:

- an **error class**: checks `instanceof` (best for you, since it confirms the failure became a 401)
- a **string**: substring of the error message
- a **regex**: matched against the message

### Async functions: use `.resolves` / `.rejects`, and **`await` them**

```ts
await expect(checkPasswordHash("pw", hash)).resolves.toBe(true);
await expect(checkPasswordHash("pw", "not-a-hash")).rejects.toThrow();
```

> ⚠️ If you forget the `await`, the test can pass before the assertion ever runs.

---

## 4. Async tests and hooks

Make the test function `async` and `await` inside it:

```ts
it("should return true for the correct password", async () => {
  const result = await checkPasswordHash(password1, hash1);
  expect(result).toBe(true);
});
```

Hooks run setup and cleanup:

```ts
beforeAll(async () => { /* once, before all tests in this describe */ });
beforeEach(() => { /* before every test */ });
afterEach(() => { /* after every test */ });
afterAll(() => { /* once, at the end */ });
```

- **`beforeAll`** suits expensive setup that tests only *read*. argon2 is deliberately slow, so hashing once and reusing the hash keeps the suite fast.
- **`beforeEach`** suits cases where tests could change shared state and each needs a fresh copy.

---

## 5. Controlling time (expiration tests)

Don't `sleep` and wait for a token to expire. **Fake the clock** instead:

```ts
import { vi, afterEach } from "vitest";

afterEach(() => {
  vi.useRealTimers(); // always restore, or later tests get a frozen clock
});

it("rejects an expired token", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  const token = makeJWT("user-1", 60, "secret");      // expires in 60s

  vi.setSystemTime(new Date("2026-01-01T00:01:01Z")); // 61s later
  expect(() => validateJWT(token, "secret")).toThrow(UnauthorizedError);
});
```

This works because both `makeJWT` and `jsonwebtoken`'s expiry check read `Date.now()`, which vitest controls. The test is **instant and deterministic**.

> 💡 Also test the other side of the boundary (still valid at 59 seconds) so you know the window is right.

---

## 6. Building "bad" inputs yourself

Some failure cases can't come out of `makeJWT`, like a token from a different issuer. Make them directly in the test:

```ts
import jwt from "jsonwebtoken";

const foreign   = jwt.sign({ sub: "user-1", iss: "not-chirpy" }, "secret"); // wrong issuer
const noSubject = jwt.sign({ iss: "chirpy" }, "secret");                   // missing sub
```

You can create tampered, unsigned or missing-claim tokens the same way.

---

## 7. Running tests

```bash
npm test                  # run once (your script: vitest --run)
npx vitest                # watch mode: reruns on save, good while writing tests
npx vitest auth           # only files matching "auth"
npx vitest -t "expired"   # only tests whose name matches "expired"
```

In code:

- `it.only(...)` runs just that test. **Don't commit it.**
- `it.skip(...)` skips that test.

### Same test, many inputs: `it.each`

```ts
it.each(["", "garbage", "a.b.c"])("rejects malformed token %s", (bad) => {
  expect(() => validateJWT(bad, "secret")).toThrow(UnauthorizedError);
});
```

---

## 8. Checklist: testing the auth functions

Each item is one `it`. Tick them off as you go.

### `hashPassword`

- [ ] Returns a string that isn't the plain password
- [ ] The hash looks like argon2 (starts with `$argon2`)
- [ ] Hashing the same password twice gives **different** hashes (salting)

### `checkPasswordHash`

- [x] Correct password → `true`
- [ ] Wrong password → `false`
- [ ] `password1` checked against `hash2` → `false`
- [ ] Empty password against a real hash → `false`
- [ ] Malformed hash string → **rejects** (the `catch` re-throws)

### `makeJWT` + `validateJWT`

- [ ] Round trip: validating a fresh token returns the same `userId`
- [ ] Wrong secret → throws `UnauthorizedError`
- [ ] Expired token → throws (fake timers)
- [ ] Not yet expired, just inside the window → still valid
- [ ] Different issuer → throws
- [ ] Token without `sub` → throws (the `typeof` guard)
- [ ] Tampered token (change one character in the payload section) → throws
- [ ] Malformed strings (`""`, `"garbage"`, `"a.b.c"`) → throw (`it.each`)
- [ ] *Optional:* `jwt.decode` the token and check that `iat`/`exp` are in **seconds** and `exp - iat === expiresIn` (this would have caught the earlier milliseconds bug)

---

## 9. Gotchas cheat sheet

| Gotcha | Fix |
|---|---|
| Sync throw crashes the test | Wrap in an arrow: `expect(() => fn()).toThrow()` |
| Async assertion "passes" wrongly | `await expect(promise).rejects...` |
| Fake time leaks into other tests | `afterEach(() => vi.useRealTimers())` |
| Comparing objects with `toBe` fails | Use `toEqual` |
| Committed `.only` hides other tests | Search for `.only(` before committing |
| Slow suite from repeated hashing | Hash once in `beforeAll` |

---

## 10. Side note: test files in the build

`tsconfig.json` includes `./src/**/*.ts`, so `npm run build` also compiles `auth.test.ts` into `dist/`. It's harmless, but you can keep test files out of the production build:

```json
"exclude": ["node_modules", "**/*.test.ts"]
```

Vitest doesn't need test files in `tsconfig` to run them.

---

## 11. Advanced topics (for later)

These matter once you test things beyond pure functions, like the Express handlers and the database:

1. **Mocking:** `vi.fn()`, `vi.spyOn()`, `vi.mock()` (module mocking) to replace the DB layer or other dependencies.
2. **HTTP/integration testing:** calling Express routes with `supertest` and checking status codes and JSON bodies (login returns a token; a bad token gets a 401).
3. **Database testing strategy:** a separate test database, migrations before tests, and cleanup between tests (truncate tables or roll back transactions).
4. **Config and environment:** `vitest.config.ts`, setup files, test-only env vars (like `JWT_SECRET`), and keeping tests from touching the dev database.
5. **Coverage:** `vitest --coverage`, reading the report, and why 100% isn't the goal.
6. **Test design:** what's worth testing, avoiding brittle tests, and test isolation.

### Prompt to paste when ready

> I've written unit tests for my auth functions in Chirpy. Now I want to learn integration testing for my Express API with vitest. Teach me (1) mocking with vi.fn/vi.spyOn/vi.mock, (2) testing routes with supertest, (3) setting up a separate test Postgres database with Drizzle migrations and cleaning it between tests, and (4) configuring vitest.config.ts with env vars like JWT_SECRET. Use my login and create-chirp endpoints as the examples, and explain the trade-offs between mocking the DB and using a real test DB.
