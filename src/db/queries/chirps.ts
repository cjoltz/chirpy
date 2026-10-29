import { asc, desc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { type NewChirp, chirps } from "../schema.js";

export async function createChirp(chirp: NewChirp) {
  const [result] = await db.insert(chirps).values(chirp).returning();
  return result;
}

type GetChirpsOptions = {
  authorId?: string;
  ascending?: boolean;
};

export async function getAllChirps({
  authorId,
  ascending = true,
}: GetChirpsOptions) {
  const order = ascending ? asc : desc;
  return await db
    .select()
    .from(chirps)
    .where(authorId ? eq(chirps.userId, authorId) : undefined)
    .orderBy(order(chirps.createdAt));
}

export async function getChirpById(id: string) {
  const [result] = await db.select().from(chirps).where(eq(chirps.id, id));
  return result;
}

export async function deleteChirp(chirpId: string) {
  const [result] = await db
    .delete(chirps)
    .where(eq(chirps.id, chirpId))
    .returning();
  return result;
}
