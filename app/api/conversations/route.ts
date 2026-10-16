import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { StoredConversation } from "@/lib/models";

export const runtime = "nodejs";

/** Return the most recently updated conversation threads for the history sidebar. */
export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .collection<StoredConversation>("conversations")
      .find({}, { projection: { title: 1, tone: 1, createdAt: 1, updatedAt: 1 } })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    return Response.json({
      conversations: rows.map((row) => ({
        id: row._id?.toString() ?? new ObjectId().toString(),
        title: row.title,
        tone: row.tone,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Could not load conversations:", error);
    return Response.json({ error: "Could not load conversation history. Check MongoDB configuration." }, { status: 500 });
  }
}
