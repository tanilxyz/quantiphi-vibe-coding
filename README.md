# Vibe — AI Chat Assistant

A full-stack AI chat assistant built for the Vibe Coding problem statement. It includes streaming AI output, a history sidebar, MongoDB persistence, and Professional / Casual / Concise tone controls.

> **Security:** never commit `.env.local`, `api.txt`, an OpenAI key, or a MongoDB password. The API key previously provided in `api.txt` should be revoked and replaced because it has been exposed in an uploaded file/chat context. Add the replacement key only to your local `.env.local` file.

## Features

### Required features
- Scrollable conversation with distinct user and assistant message styles.
- Real-time assistant response streaming over NDJSON.
- Sidebar with recent threads; click a thread to reload its messages.
- OpenAI Responses API integration in a server-side route.
- MongoDB persistence for prompt, answer, tone, timestamps, and conversation title.
- Professional, Casual, and Concise tone selections sent as server-side instructions.
- Server-side input validation; API credentials are never sent to the browser.

### Two extra features
1. **Suggested prompts** to help users start a conversation.
2. **Copy response** to copy an assistant reply.

### Setup helper
- `GET /api/health` reports whether the OpenAI key is present and MongoDB is reachable, without returning credentials.

## Tech stack

- Next.js App Router, React, and TypeScript
- OpenAI Node.js SDK / Responses API
- MongoDB Node.js Driver and MongoDB Atlas
- CSS, React Markdown, and remark-gfm

## Quick start

1. Install Node.js 20.9 or newer (Node 22 LTS recommended), Git, and VS Code.
2. Extract this project ZIP and open the `vibe-chat-assistant` folder in VS Code.
3. Install packages:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env.local` and set your own values:

   ```dotenv
   OPENAI_API_KEY=YOUR_NEW_OPENAI_API_KEY
   OPENAI_MODEL=gpt-4.1-mini
   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER_HOST/?retryWrites=true&w=majority
   MONGODB_DB=vibe_chat
   ```

5. Create an Atlas deployment, database user, and IP access-list entry, then replace the example MongoDB URI with the real one. Do not share or commit `.env.local`.
6. Run the app:

   ```bash
   npm run dev
   ```

7. Open <http://localhost:3000>. Check configuration at <http://localhost:3000/api/health>.
8. Before submission, run `npm run typecheck` and `npm run build`, test the listed features, and push only source files to a public GitHub repository.

**Read [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) for the complete start-to-finish guide**, including exact Atlas setup, API-key rotation, connection-string configuration, troubleshooting, verification, and GitHub submission.

## Architecture

```text
Browser (React UI)
  ├── GET  /api/health                 -> configuration/database ping
  ├── GET  /api/conversations           -> recent thread list
  ├── GET  /api/conversations/:id       -> load saved thread
  └── POST /api/chat                   -> validate prompt and save user message
                                          ├── OpenAI Responses API (stream=true)
                                          ├── stream NDJSON text deltas to browser
                                          └── save assistant response to MongoDB

MongoDB: vibe_chat.conversations
  └── { title, tone, createdAt, updatedAt, messages: [{ role, content, createdAt, tone }] }
```

## API routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Checks server configuration and MongoDB connectivity. |
| `GET` | `/api/conversations` | Returns up to 50 recently updated conversation threads. |
| `GET` | `/api/conversations/:id` | Returns one saved conversation and its messages. |
| `POST` | `/api/chat` | Validates input, persists the prompt, requests a streamed AI response, and persists the answer. |

`POST /api/chat` accepts JSON in this format:

```json
{
  "message": "Explain recursion with an example",
  "tone": "Concise",
  "conversationId": null
}
```

The response content type is `application/x-ndjson`. Each line is a JSON event such as `{"type":"delta","text":"Hello"}`, followed by `{"type":"done"}`. `X-Conversation-Id` identifies the thread.

## Development checks

```bash
npm run typecheck
npm run build
```

Manual test checklist: stream a response; change tone; refresh and reopen history; inspect MongoDB data; test prompt suggestions; copy an assistant answer; verify that `.env.local` is ignored by Git.

## Important limitations

This assessment starter does not include authentication, per-user conversation isolation, rate limiting, or production deployment. Conversation history is shared in this demo, so do not expose it to real users or store sensitive information without adding authentication and authorization.
