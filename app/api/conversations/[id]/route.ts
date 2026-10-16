import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { StoredConversation } from "@/lib/models";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid conversation ID." }, { status: 400 });
    }

    const db = await getDb();
    const conversation = await db.collection<StoredConversation>("conversations").findOne({ _id: new ObjectId(id) });
    if (!conversation) {
      return Response.json({ error: "Conversation not found." }, { status: 404 });
    }

    return Response.json({
      conversation: {
        id: conversation._id?.toString(),
        title: conversation.title,
        tone: conversation.tone,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: (conversation.messages ?? []).map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
          tone: message.tone,
        })),
      },
    });
  } catch (error) {
    console.error("Could not load conversation:", error);
    return Response.json({ error: "Could not load this conversation." }, { status: 500 });
  }
}
