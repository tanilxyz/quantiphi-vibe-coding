import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight local setup check. It intentionally returns configuration flags,
 * not secrets, raw connection strings, or provider error details.
 */
export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const mongodbConfigured = Boolean(process.env.MONGODB_URI);
  let mongodbReachable = false;

  if (mongodbConfigured) {
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      mongodbReachable = true;
    } catch (error) {
      // Log details only on the server; do not return connection data to clients.
      console.error("Health check could not reach MongoDB:", error);
    }
  }

  const ready = openaiConfigured && mongodbConfigured && mongodbReachable;
  return Response.json(
    {
      status: ready ? "ok" : "needs-configuration",
      checks: { openaiConfigured, mongodbConfigured, mongodbReachable },
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      database: process.env.MONGODB_DB || "vibe_chat",
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
