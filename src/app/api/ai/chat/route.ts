import { getSessionUser } from "@/lib/auth";
import { answerFromKnowledge, KNOWLEDGE_BASE } from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1200) : "";
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  if (!question) return Response.json({ error: "Ask a question." }, { status: 400 });

  const knowledge = answerFromKnowledge(question);
  const token = process.env.HF_TOKEN?.trim();
  if (!token) return Response.json({ ...knowledge, provider: "Knowledge Bank fallback", notice: "Add HF_TOKEN in .env to enable free general-purpose model answers; this response uses verified local guidance." });

  const context = KNOWLEDGE_BASE.map((article) => `${article.title}: ${article.content}`).join("\n");
  const prompt = `<s>[INST] You are Bhulekh AI, a helpful land-record operations assistant. Answer using the provided Knowledge Bank. If the answer is not in the Knowledge Bank, say that clearly and do not invent policy. Keep the answer concise and practical.\n\nKnowledge Bank:\n${context}\n\nConversation:\n${history.map((item: { role?: string; text?: string }) => `${item.role}: ${item.text}`).join("\n")}\nuser: ${question} [/INST]`;
  try {
    const response = await fetch("https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.3", {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 350, temperature: 0.2, return_full_text: false } }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json().catch(() => null) as { generated_text?: string; error?: string } | { generated_text?: string }[] | null;
    const generated = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
    if (response.ok && generated) return Response.json({ answer: generated.trim(), sources: knowledge.sources, provider: "Hugging Face free inference" });
  } catch {
    // Fall through to the local Knowledge Bank response when the free provider is unavailable.
  }
  return Response.json({ ...knowledge, provider: "Knowledge Bank fallback", notice: token ? "Free model unavailable; answered from verified local guidance." : "Add HF_TOKEN in .env to enable free general-purpose model answers; this response uses verified local guidance." });
}