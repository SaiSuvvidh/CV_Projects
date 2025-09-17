import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HuggingFaceInference } from "@langchain/community/llms/hf";

// 🔹 Choose provider here: "openai" | "gemini" | "ollama" | "huggingface"
const PROVIDER = process.env.LLM_PROVIDER || "gemini";

const GOOGLE_API_KEY = "AIzaSyAVjpLYo8j-gx9uyzfDLbs49GqCgxcmRY";

export function getLLM() {
  switch (PROVIDER) {
    case "openai":
      return new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
        apiKey: process.env.OPENAI_API_KEY,
      });

    case "gemini":
      return new ChatGoogleGenerativeAI({
        model: "gemini-1.5-flash",
        apiKey: GOOGLE_API_KEY,
      });

    case "ollama":
      return new ChatOllama({
        model: "llama3",  // or mistral/gemma etc
        temperature: 0,
      });

    case "huggingface":
      return new HuggingFaceInference({
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        apiKey: process.env.HF_API_KEY,
      });

    default:
      throw new Error(`Unsupported provider: ${PROVIDER}`);
  }
}
