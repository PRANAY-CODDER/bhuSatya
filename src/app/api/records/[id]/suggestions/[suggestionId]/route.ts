import { getSessionUser } from "@/lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; suggestionId: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, suggestionId } = await context.params;
  const body = await request.json().catch(() => ({}));
  return Response.json({ ok: true, recordId: id, suggestionId, action: body.action ?? "dismiss", value: body.value ?? null, placeholder: true });
}
