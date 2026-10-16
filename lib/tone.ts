import type { Tone } from "@/types/chat";

export const TONES: Tone[] = ["Professional", "Casual", "Concise"];

export function isTone(value: unknown): value is Tone {
  return typeof value === "string" && TONES.includes(value as Tone);
}

export function instructionsForTone(tone: Tone): string {
  const toneInstructions: Record<Tone, string> = {
    Professional:
      "Use a professional, courteous tone. Structure complex answers clearly and use precise language.",
    Casual:
      "Use a friendly, approachable, conversational tone. Natural contractions are fine; remain helpful and respectful.",
    Concise:
      "Be concise and direct. Lead with the answer and avoid unnecessary detail while preserving important nuance.",
  };

  return [
    "You are a helpful AI chat assistant. Answer the user's request accurately and clearly. If you are uncertain, say so rather than inventing facts.",
    `Tone preference: ${tone}. ${toneInstructions[tone]}`,
  ].join("\n\n");
}
