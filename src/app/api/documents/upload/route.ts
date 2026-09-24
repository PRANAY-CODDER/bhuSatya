import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ accepted: false, error: "A file is required." }, { status: 400 });
  }

  return NextResponse.json({
    accepted: true,
    document: {
      name: file.name,
      size: file.size,
      status: "uploaded",
      message: "Placeholder accepted. OCR and extraction are not connected yet.",
    },
  });
}