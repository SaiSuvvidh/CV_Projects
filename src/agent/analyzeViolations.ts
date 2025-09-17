// src/agents/analyzeViolations.ts
import { getLLM } from "./llmProvider";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const llm = getLLM();

/**
 * Normalizes LLM output into one of:
 *  - "END_EXAM"
 *  - "FLASH_WARNING"
 *  - "IGNORE"
 *
 * Returns: { decision, reason, raw }
 */
export async function analyzeViolations(violations: any[]) {
  // Strict system prompt that instructs the model to choose only one token.
  const systemText = `
You are an automated exam proctor agent. You will receive a JSON array of violation events.
You MUST follow these rules exactly and reply with a single line containing one of the tokens:
  - END_EXAM
  - FLASH_WARNING
  - IGNORE

Rules (apply strictly):
  1) If one or more CRITICAL-level violations exist in the provided list, return END_EXAM.
  2) If three or more MAJOR-level violations occurred within a short time window, return END_EXAM.
  3) If five or more WARNING-level violations are present, return FLASH_WARNING.
  4) Otherwise return IGNORE.

After returning the single token, you MAY optionally, on the next line, add a short reason (one sentence). But the first line must be exactly the token above.
Do not return anything else.
`;

  const humanText = `Violations:\n${JSON.stringify(violations, null, 2)}`;

  const messages = [new SystemMessage(systemText), new HumanMessage(humanText)];

  let rawResponse: any;
  try {
    rawResponse = await llm.invoke(messages);
  } catch (err) {
    console.error("LLM invoke error in analyzeViolations:", err);
    // On LLM failure, default to IGNORE (safe), but include error info
    return { decision: "IGNORE" as const, reason: "LLM invoke failed", raw: String(err) };
  }

  // Helper to extract text from many possible return shapes
  function extractText(resp: any): string {
    if (!resp && resp !== "") return "";
    if (typeof resp === "string") return resp;
    // LangChain Chat models sometimes return { content: "..." }
    if ("content" in resp && typeof resp.content === "string") return resp.content;
    // Some providers return an object with 'text'
    if ("text" in resp && typeof resp.text === "string") return resp.text;
    // Some return a 'generations' nested structure
    if ("generations" in resp && Array.isArray(resp.generations)) {
      try {
        // generations may be [[{ text: "..." }]] or [{ text: "..." }]
        const g = resp.generations;
        if (Array.isArray(g[0])) {
          return g[0][0]?.text ?? JSON.stringify(resp);
        } else {
          return g[0]?.text ?? JSON.stringify(resp);
        }
      } catch {
        return JSON.stringify(resp);
      }
    }
    // fallback stringify
    return JSON.stringify(resp);
  }

  const rawText = extractText(rawResponse).trim();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Determine decision token by scanning first line, then the whole text for tokens
  const findToken = (txt: string | undefined): string | null => {
    if (!txt) return null;
    const m = txt.match(/\b(END_EXAM|FLASH_WARNING|IGNORE)\b/i);
    return m ? m[0].toUpperCase() : null;
  };

  let token = findToken(lines[0]) || findToken(rawText);

  // Fallback heuristics (if model didn't return token exactly)
  if (!token) {
    const t = rawText.toLowerCase();
    if (t.includes("end") || t.includes("terminate") || t.includes("suspend")) token = "END_EXAM";
    else if (t.includes("warning") || t.includes("flash") || t.includes("alert")) token = "FLASH_WARNING";
    else token = "IGNORE";
  }

  // Optional reason: use the remainder after first line, or the first sentence containing a reason
  let reason: string | undefined = undefined;
  if (lines.length > 1) {
    reason = lines.slice(1).join(" ");
  } else {
    // try to find a short sentence after token in rawText
    const after = rawText.replace(new RegExp(token, "i"), "").trim();
    if (after) reason = after.split(/[.?!]\s/)[0].slice(0, 300);
  }

  return {
    decision: token as "END_EXAM" | "FLASH_WARNING" | "IGNORE",
    reason: reason ? reason : undefined,
    raw: rawText,
  };
}
