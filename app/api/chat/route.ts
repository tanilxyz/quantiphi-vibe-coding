import OpenAI from "openai";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { StoredConversation, StoredMessage } from "@/lib/models";
import { instructionsForTone, isTone } from "@/lib/tone";
import type { Tone } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const MAX_MESSAGE_LENGTH = 4000;
const HISTORY_LIMIT = 20;

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

function encodeEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

function friendlyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred while generating the response.";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const payload = body as { message?: unknown; tone?: unknown; conversationId?: unknown };
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const tone: Tone = isTone(payload.tone) ? payload.tone : "Professional";
  const requestedId = typeof payload.conversationId === "string" ? payload.conversationId : "";

  if (!message) return Response.json({ error: "Please enter a message." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, { status: 400 });
  }
  if (requestedId && !ObjectId.isValid(requestedId)) {
    return Response.json({ error: "Invalid conversation ID." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY is missing. Add it to .env.local." }, { status: 500 });
  }

  try {
    const db = await getDb();
    const conversations = db.collection<StoredConversation>("conversations");
    const now = new Date();
    const userMessage: StoredMessage = { role: "user", content: message, createdAt: now, tone };
    let conversationId: ObjectId;
    let priorMessages: StoredMessage[] = [];

    if (requestedId) {
      const id = new ObjectId(requestedId);
      const existing = await conversations.findOne({ _id: id });
      if (!existing) return Response.json({ error: "Conversation not found." }, { status: 404 });
      conversationId = id;
      priorMessages = existing.messages ?? [];
      await conversations.updateOne(
        { _id: id },
        { $push: { messages: userMessage }, $set: { tone, updatedAt: now } },
      );
    } else {
      const newConversation: StoredConversation = {
        title: message.slice(0, 54) + (message.length > 54 ? "…" : ""),
        tone,
        createdAt: now,
        updatedAt: now,
        messages: [userMessage],
      };
      const inserted = await conversations.insertOne(newConversation);
      conversationId = inserted.insertedId;
    }

    const openai = new OpenAI({ apiKey });
    const controller = new AbortController();
    const input = [...priorMessages, userMessage]
      .slice(-HISTORY_LIMIT)
      .map((item) => ({ role: item.role, content: item.content }));

    let responseStream;
    try {
      responseStream = await openai.responses.create(
        {
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions: instructionsForTone(tone),
          input,
          stream: true,
        },
        { signal: controller.signal },
      );
    } catch (error) {
      console.error("OpenAI request failed:", error);
      return new Response(
        JSON.stringify({ error: `AI provider request failed: ${friendlyError(error)}` }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "X-Conversation-Id": conversationId.toString(),
          },
        },
      );
    }

    const responseBody = new ReadableStream<Uint8Array>({
      async start(streamController) {
        let assistantText = "";
        try {
          for await (const event of responseStream) {
            if (event.type === "response.output_text.delta") {
              assistantText += event.delta;
              streamController.enqueue(encodeEvent({ type: "delta", text: event.delta }));
            }
          }

          if (assistantText.trim()) {
            const assistantMessage: StoredMessage = {
              role: "assistant",
              content: assistantText,
              createdAt: new Date(),
              tone,
            };
            await conversations.updateOne(
              { _id: conversationId },
              { $push: { messages: assistantMessage }, $set: { updatedAt: new Date(), tone } },
            );
          }
          streamController.enqueue(encodeEvent({ type: "done" }));
        } catch (error) {
          console.error("Streaming response failed:", error);
          if (assistantText.trim()) {
            try {
              await conversations.updateOne(
                { _id: conversationId },
                {
                  $push: {
                    messages: {
                      role: "assistant",
                      content: assistantText,
                      createdAt: new Date(),
                      tone,
                    },
                  },
                  $set: { updatedAt: new Date(), tone },
                },
              );
            } catch (dbError) {
              console.error("Could not save partial response:", dbError);
            }
          }
          streamController.enqueue(encodeEvent({ type: "error", message: "The response stream was interrupted. Try sending your message again." }));
        } finally {
          streamController.close();
        }
      },
      cancel() {
        controller.abort();
      },
    });

    return new Response(responseBody, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Conversation-Id": conversationId.toString(),
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Chat endpoint failed:", error);
    return Response.json({ error: "The chat service could not complete the request. Check database settings and server logs." }, { status: 500 });
  }
}
