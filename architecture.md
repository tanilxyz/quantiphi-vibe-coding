# Implementation notes for the viva

## Request lifecycle
1. React sends `{ message, tone, conversationId }` to `POST /api/chat`.
2. The server validates message length and tone. API keys are read from server-only environment variables.
3. The server inserts the user prompt into MongoDB before calling the model. For an existing thread, it loads prior messages and appends the new prompt.
4. `instructionsForTone()` converts the tone selection into the model's server-side `instructions` parameter.
5. OpenAI is called with `stream: true`. Each `response.output_text.delta` becomes one NDJSON `{ type: "delta", text }` event.
6. The browser parses each line and appends text to the current assistant bubble as it arrives.
7. When generation finishes, the server stores the full assistant response, including timestamp and tone, in the same conversation document.
8. The UI reloads the recent conversation list so the latest thread appears at the top.

## Why NDJSON?
NDJSON lets the server send typed events (`delta`, `done`, `error`) while streaming. The UI does not have to guess whether a chunk is a token, a completion signal, or an error. It is simple to inspect in DevTools and straightforward to explain in a viva.

## Why embed messages inside a conversation document?
The problem statement explicitly asks MongoDB to store the conversation object, including timestamps, user prompt, and AI response. An embedded `messages` array keeps the thread and its turns together. For a large-scale product, very long conversations would need a separate messages collection or an archival strategy because MongoDB documents have a size limit.

## Tone behavior
The UI stores the selected tone as state, sends it with each chat request, and the backend validates it against the three allowed values. The selected tone becomes part of the API `instructions`; it is not just a visual setting. Each user/assistant message records the tone used for that turn.

## Health check and local configuration
`GET /api/health` reports whether `OPENAI_API_KEY` is configured and tests MongoDB connectivity with a ping. It returns status flags only; it never returns credentials or raw provider errors. See [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) for Atlas setup, environment configuration, verification, troubleshooting, and GitHub publishing.

## Security boundary and current limitations
The OpenAI key and MongoDB URI are server-only values in `.env.local`. That file and `api.txt` are excluded by `.gitignore`. This assessment demo has no authentication or per-user ownership checks, so conversation history is not private between different people who can access the instance. Add authentication and per-user authorization before deploying it as a public multi-user service.
