import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import { createWorker, OEM } from "tesseract.js";
import { NextResponse } from "next/server";
import path from "node:path";
import { extractFields, type FieldExtractionResult } from "@/lib/nlp/extractFields";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_OCR_DIMENSION = 3_000;
const LANG_PATH = path.join(process.cwd(), "public", "tesseract-lang");
const TESSERACT_WORKER_PATH = path.join(
  process.cwd(),
  "node_modules",
  "tesseract.js",
  "src",
  "worker-script",
  "node",
  "index.js",
);
const USE_MOCK = process.env.USE_MOCK_EXTRACTION === "true";
const acceptedTypes = new Map([
  ["application/pdf", [".pdf"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/tiff", [".tif", ".tiff"]],
  ["image/tif", [".tif", ".tiff"]],
]);

type OcrLine = { text: string; confidence: number };

let workerPromise: ReturnType<typeof createWorker> | null = null;

function getExtension(fileName: string): string {
  return fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
}
function isAcceptedFile(file: File): boolean {
  const extensions = acceptedTypes.get(file.type);
  return Boolean(extensions?.includes(getExtension(file.name)));
}

async function getOcrWorker() {
  workerPromise ??= createWorker("hin+eng", OEM.LSTM_ONLY, {
    langPath: LANG_PATH,
    workerPath: TESSERACT_WORKER_PATH,
    gzip: false,
    cacheMethod: "none",
  });
  return workerPromise;
}

async function prepareImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({
      width: MAX_OCR_DIMENSION,
      height: MAX_OCR_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}

async function readPdf(input: Buffer): Promise<{ text: string; image?: Buffer }> {
  const loadingTask = getDocument({ data: new Uint8Array(input) });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length >= 20) return { text };

    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_OCR_DIMENSION / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale: Math.max(1, scale) });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    return { text: "", image: canvas.toBuffer("image/png") };
  } finally {
    await loadingTask.destroy();
  }
}
async function recognize(input: Buffer) {
  const worker = await getOcrWorker();
  const result = await worker.recognize(input, {}, { text: true, blocks: true });
  const blocks = result.data.blocks ?? [];
  const lines: OcrLine[] = blocks.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.lines.map((line) => ({
      text: line.text,
      confidence: line.confidence,
    }))),
  );

  return {
    text: result.data.text.trim(),
    confidence: Math.round(result.data.confidence),
    lines,
  };
}

function buildMockExtraction(): FieldExtractionResult {
  const rawText = [
    "Record No: LR-2025-031",
    "Owner Name: Ramesh Kumar",
    "Father's Name: Sh. Baldev Singh",
    "Khasra No.: 411/2",
    "Village: Sahnewal",
    "District: Ludhiana",
    "State: Punjab",
    "Area: 1.77 acres",
    "Land Type: agricultural",
    "Mutation Type: inheritance",
    "Source Document: Jamabandi",
  ].join("\n");
  return extractFields(rawText, rawText.split("\n").map((text) => ({ text, confidence: 98 })), 98);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a file in the 'file' field." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be non-empty and no larger than 10 MB." }, { status: 413 });
    }
    if (!isAcceptedFile(file)) {
      return NextResponse.json({ error: "Only PDF, JPG, JPEG, PNG, and TIFF files are accepted." }, { status: 415 });
    }

    if (USE_MOCK) return NextResponse.json(buildMockExtraction());

    const input = Buffer.from(await file.arrayBuffer());
    let rawText = "";
    let ocrConfidence = 0;
    let lines: OcrLine[] = [];

    if (file.type === "application/pdf") {
      const pdf = await readPdf(input);
      if (pdf.text) {
        rawText = pdf.text;
        ocrConfidence = 100;
      } else {
        const result = await recognize(await prepareImage(pdf.image!));
        ({ text: rawText, confidence: ocrConfidence, lines } = result);
      }
    } else {
      const result = await recognize(await prepareImage(input));
      ({ text: rawText, confidence: ocrConfidence, lines } = result);
    }

    // Tesseract works well on typed, printed, and clearly scanned text. It performs poorly on cursive handwritten Devanagari, which is a known open-source OCR limitation.
    const extraction = extractFields(rawText, lines, ocrConfidence);
    return NextResponse.json(extraction);
  } catch (error) {
    console.error("Land-record extraction failed", error);
    return NextResponse.json({ error: "Land-record extraction failed. Please try again." }, { status: 500 });
  }
}
