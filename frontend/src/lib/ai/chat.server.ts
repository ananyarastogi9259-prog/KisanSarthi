import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { assistantInstructions } from "./assistant-prompt";
import { detectConversationLanguage, type AssistantLanguage } from "./language";
import { getFarmingAnswer } from "./farming-knowledge";

function extractUserText(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .map((part) => (part.type === "text" && "text" in part ? String(part.text) : ""))
      .join(" ");
  }
  return "";
}

function resolveConversationLanguage(messages: UIMessage[], fallback: AssistantLanguage): AssistantLanguage {
  let lang: AssistantLanguage = fallback;
  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = extractUserText(m);
    if (text.trim()) {
      lang = detectConversationLanguage(text, lang);
    }
  }
  return lang;
}

export async function handleChat(request: Request) {
  let body: { messages?: UIMessage[]; lang?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
  if (messages.length === 0) return Response.json({ error: "Please type a question." }, { status: 400 });

  const initialLang: AssistantLanguage = body.lang === "hi" ? "hi" : "en";
  const detectedLang = resolveConversationLanguage(messages, initialLang);

  // Check if live AI API key is configured (Gemini or OpenAI)
  const geminiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
  const openaiKey = process.env["OPENAI_API_KEY"];

  if (geminiKey || openaiKey) {
    try {
      const systemPrompt = assistantInstructions(detectedLang);
      let provider: ReturnType<typeof createOpenAI>;
      let modelId: string;

      if (geminiKey) {
        provider = createOpenAI({
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: geminiKey,
        });
        modelId = "gemini-2.0-flash";
      } else {
        provider = createOpenAI({ apiKey: openaiKey! });
        modelId = "gpt-4o-mini";
      }

      const result = streamText({
        model: provider.chat(modelId),
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
        abortSignal: request.signal,
        maxTokens: 1024,
      });

      return result.toUIMessageStreamResponse();
    } catch (e) {
      console.warn("External AI call failed, falling back to built-in Kisan Sahayak engine:", e);
    }
  }

  // Built-in intelligent Kisan Sahayak Farming Expert Stream
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUserMessage ? extractUserText(lastUserMessage) : "";
  const responseText = getFarmingAnswer(userText, detectedLang);

  const stream = createUIMessageStream({
    async execute({ writer }) {
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: "part-0" });

      const lines = responseText.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const words = lines[i].split(" ");
        for (let j = 0; j < words.length; j++) {
          const word = words[j];
          if (word.length > 0) {
            writer.write({
              type: "text-delta",
              id: "part-0",
              textDelta: word + (j < words.length - 1 ? " " : ""),
            });
            await new Promise((r) => setTimeout(r, 12));
          }
        }
        if (i < lines.length - 1) {
          writer.write({ type: "text-delta", id: "part-0", textDelta: "\n" });
        }
      }

      writer.write({ type: "text-end", id: "part-0" });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}


