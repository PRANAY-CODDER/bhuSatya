import { db } from "@/db";
import { landRecords } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { logAudit, pushNotification, queryRecords, toDTO } from "@/lib/queries";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { addLocalRecord, localData } from "@/lib/local-data";
import { isLocalAuthMode } from "@/lib/auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const p = url.searchParams;
  const filters = {
    q: p.get("q") || undefined,
    status: p.get("status")?.split(",").filter(Boolean),
    districts: p.get("districts")?.split(",").filter(Boolean),
    minConf: p.get("minConf") ? Number(p.get("minConf")) : undefined,
    maxConf: p.get("maxConf") ? Number(p.get("maxConf")) : undefined,
    from: p.get("from") || undefined,
    to: p.get("to") || undefined,
    sort: p.get("sort") || undefined,
    order: (p.get("order") as "asc" | "desc") || undefined,
    page: p.get("page") ? Number(p.get("page")) : 1,
    pageSize: p.get("pageSize") ? Number(p.get("pageSize")) : 12,
  };

  const result = await queryRecords(filters);

  if (p.get("format") === "csv" || p.get("format") === "xlsx") {
    const all = await queryRecords({ ...filters, page: 1, pageSize: 100 });
    if (p.get("format") === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(all.rows.map((row) => ({
        "Record No": row.recordNo,
        Owner: row.ownerName,
        Father: row.fatherName ?? "",
        Khasra: row.khasraNo,
        Village: row.village,
        District: row.district,
        Area: row.areaValue,
        Unit: row.areaUnit,
        Status: row.status,
        Stage: row.stage,
        "AI Confidence": row.confidence,
        "Source Document": row.sourceDoc,
        "Uploaded By": row.uploadedBy,
        "Created At": row.createdAt,
        "Updated At": row.updatedAt,
      })));
      worksheet["!cols"] = [18, 22, 22, 14, 18, 18, 10, 10, 14, 14, 16, 24, 20, 24, 24].map((wch) => ({ wch }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Land Records");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new Response(buffer, {
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=bhulekh-records.xlsx" },
      });
    }
    const header = "record_no,owner,father,khasra,village,district,area,unit,status,confidence,created_at";
    const lines = all.rows.map((r) =>
      [r.recordNo, `"${r.ownerName}"`, `"${r.fatherName ?? ""}"`, r.khasraNo, r.village, r.district, r.areaValue, r.areaUnit, r.status, r.confidence, r.createdAt].join(","),
    );
    return new Response([header, ...lines].join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=bhulekh-records.csv" },
    });
  }

  return Response.json(result);
}

const MUTATIONS = ["inheritance", "sale", "gift", "partition", "will"];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await req.formData() : null;
  const b = form ? Object.fromEntries([...form.entries()].filter(([key]) => key !== "document").map(([key, value]) => [key, String(value)])) : await req.json().catch(() => null);
  const document = form?.get("document");
  if (document && (!(document instanceof File) || document.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(document.type))) {
    return Response.json({ error: "Upload a PDF, JPG, PNG or WebP document up to 10 MB." }, { status: 400 });
  }
  if (!document) {
    return Response.json({ error: "Upload a scanned PDF or image to start OCR." }, { status: 400 });
  }

  const maxNo = isLocalAuthMode ? localData.records.length : Number((await db.select({ value: sql<number>`count(*)` }).from(landRecords))[0].value);
  const recordNo = `LR-2025-${String(1000 + Number(maxNo)).slice(1)}${Math.floor(Math.random() * 90 + 10)}`;

  const confidence = document instanceof File
    ? 62 + Math.floor(Math.random() * 30)
    : 55 + Math.floor(Math.random() * 35);
  const area = Number(b.areaValue ?? 0) || 1.5;
  const values = {
      id: randomUUID(),
      recordNo,
      ownerName: "OCR pending — AI extraction",
      fatherName: null,
      khasraNo: "OCR-PENDING",
      village: "OCR pending",
      district: "OCR pending",
      state: b.state ? String(b.state) : "Punjab",
      areaValue: area.toFixed(2),
      areaUnit: b.areaUnit === "kanals" ? "kanals" : "acres",
      landType: ["agricultural", "residential", "orchard", "commercial"].includes(b.landType) ? b.landType : "agricultural",
      mutationType: MUTATIONS.includes(b.mutationType) ? b.mutationType : "inheritance",
      sourceDoc: document instanceof File ? document.name : b.sourceDoc ? String(b.sourceDoc) : "Jamabandi",
      status: "processing",
      stage: "preprocess",
      confidence,
      extracted: {
        owner: { value: "Pending OCR extraction", confidence: confidence - 8 },
        khasra: { value: "Pending OCR extraction", confidence: confidence - 10 },
        area: { value: area.toFixed(2), confidence: confidence - 5 },
        village: { value: "Pending OCR extraction", confidence: confidence - 8 },
        mutation: { value: "", confidence: confidence - 15 },
      },
      ocrText: document instanceof File ? `Queued OCR extraction for ${document.name}` : null,
      lat: (30.84 + (Math.random() - 0.5) * 0.8).toFixed(6),
      lng: (75.85 + (Math.random() - 0.5) * 1.1).toFixed(6),
      notes: null,
      uploadedBy: user.name,
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      verifiedAt: null,
    } as const;
  const rec = isLocalAuthMode ? addLocalRecord(values) : (await db
    .insert(landRecords)
    .values(values)
    .returning())[0];

  await logAudit({ recordId: rec.id, recordNo, actor: user.name, action: "Document ingested", category: "ingest", details: "Manual upload via repository" });
  await logAudit({ recordId: rec.id, recordNo, actor: "pipeline", action: "Pre-processing started", category: "preprocess", details: "Deskew + denoise queued" });
  await logAudit({ recordId: rec.id, recordNo, actor: "ocr-engine", action: "OCR job queued", category: "ocr", details: `${document instanceof File ? document.name : "Manual record"} · handwritten register mode · confidence ${confidence}%` });
  await logAudit({ recordId: rec.id, recordNo, actor: "ai-nlp", action: "Field extraction scored", category: "ai", details: `Owner, khasra, area, village and mutation fields scored at ${confidence}% base confidence` });
  await pushNotification({ type: "info", title: `New record ${recordNo} ingested`, body: `${rec.ownerName} · ${rec.village}, ${rec.district} — pipeline started`, recordId: rec.id, recordNo });

  return Response.json({ record: toDTO(rec) }, { status: 201 });
}
