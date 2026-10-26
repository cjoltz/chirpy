import { asc, desc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { type NewChirp, chirps } from "../schema.js";

export async function createChirp(chirp: NewChirp) {
  const [result] = await db.insert(chirps).values(chirp).returning();
  return result;
}

export async function getAllChirps(ascending: boolean = true) {
  const order = ascending ? asc : desc;
  return await db.select().from(chirps).orderBy(order(chirps.createdAt));
}

export async function getChirpById(id: string) {
  const [result] = await db.select().from(chirps).where(eq(chirps.id, id));
  return result;
}
