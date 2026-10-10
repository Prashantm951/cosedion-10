import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ brand: z.string().max(200), handle: z.string().max(200), bio: z.string().max(4000), context: z.string().max(2000).optional() });

const schema = {
  name: "scam_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["scam_probability", "indicators", "scam_phrases", "explanation"],
    properties: {
      scam_probability: { type: "number" },
      indicators: { type: "array", items: { type: "string" } },
      scam_phrases: { type: "array", items: { type: "string" } },
      explanation: { type: "string" },
    },
  },
};

export const analyzeScam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: "You are a brand-protection fraud analyst. Assess whether a social account or app impersonates the brand to scam customers. scam_probability is 0-1. indicators are short labels. scam_phrases are exact substrings copied from the text. explanation is 3-4 plain-English sentences. Respond in JSON." },
          { role: "user", content: `Brand: ${data.brand}\nAccount/App: ${data.handle}\nText: ${data.bio}\n${data.context ?? ""}` },
        ],
        response_format: { type: "json_schema", json_schema: schema },
      }),
    });
    if (res.status === 429) throw new Error("AI is busy right now, try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are used up for this workspace.");
    if (!res.ok) { console.error("AI error", res.status, await res.text()); throw new Error("AI analysis failed"); }
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    return {
      scam_probability: Math.max(0, Math.min(1, Number(parsed.scam_probability) || 0)),
      indicators: (parsed.indicators ?? []).slice(0, 8).map(String) as string[],
      scam_phrases: (parsed.scam_phrases ?? []).slice(0, 10).map(String) as string[],
      explanation: String(parsed.explanation ?? ""),
      source: "ai",
    };
  });
