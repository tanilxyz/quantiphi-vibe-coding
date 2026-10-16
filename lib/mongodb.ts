import { Db, MongoClient } from "mongodb";

type MongoGlobal = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const mongoGlobal = globalThis as MongoGlobal;

/** Reuse one MongoClient across requests and Next.js hot reloads. */
export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to .env.local.");
  }

  if (!mongoGlobal._mongoClientPromise) {
    const client = new MongoClient(uri);
    mongoGlobal._mongoClientPromise = client.connect();
  }

  const client = await mongoGlobal._mongoClientPromise;
  return client.db(process.env.MONGODB_DB || "vibe_chat");
}
