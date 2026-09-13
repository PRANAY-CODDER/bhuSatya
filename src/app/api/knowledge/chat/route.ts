import { getSessionUser } from "@/lib/auth";
import { answerFromKnowledge } from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return Response.json({ error: "Ask a question." }, { status: 400 });
  return Response.json(answerFromKnowledge(question));
}
