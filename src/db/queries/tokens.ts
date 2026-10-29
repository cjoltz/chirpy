import { db } from "../index.js";
import { refreshTokens } from "../schema.js";
import { and, eq, gt, isNull } from "drizzle-orm";

export async function createRefreshToken(
  token: string,
  userId: string,
  expiresInSeconds: number,
) {
  const [result] = await db
    .insert(refreshTokens)
    .values({
      token,
      userId,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    })
    .returning();
  return result;
}

export async function getUserIdFromRefreshToken(token: string) {
  const [result] = await db
    .select({ userId: refreshTokens.userId })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, token),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    );
  return result?.userId; // undefined if token not valid
}

export async function revokeRefreshToken(token: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, token));
}
