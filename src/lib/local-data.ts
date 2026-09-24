import { randomUUID } from "crypto";
import type { AuditEvent, LandRecord, Notification } from "@/db/schema";

const state = globalThis as typeof globalThis & {
  __bhulekhLocalData?: {
    records: LandRecord[];
    audits: AuditEvent[];
    notifications: Notification[];
  };
};

const now = Date.now();
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function record(n: number, ownerName: string, village: string, district: string, status: string, confidence: number, stage: string): LandRecord {
  const createdAt = new Date(now - n * 86_400_000);
  return {
    id: id(n),
    recordNo: `LR-2025-${String(30 + n).padStart(3, "0")}`,
    ownerName,
    fatherName: "Sh. Rajendra Kumar",
    khasraNo: `${410 + n}/${(n % 3) + 1}`,
    village,
    district,
    state: "Punjab",
    areaValue: (1.4 + n * 0.37).toFixed(2),
    areaUnit: "acres",
    landType: n % 4 === 0 ? "residential" : "agricultural",
    mutationType: n % 3 === 0 ? "sale" : "inheritance",
    sourceDoc: n % 2 ? "Jamabandi" : "Khatoni",
    status,
    stage,
    confidence,
    extracted: {
      owner: { value: ownerName, confidence: Math.min(99, confidence + 4) },
      khasra: { value: `${410 + n}/${(n % 3) + 1}`, confidence: confidence },
      area: { value: (1.4 + n * 0.37).toFixed(2), confidence: Math.max(45, confidence - 5) },
      village: { value: village, confidence: Math.min(99, confidence + 2) },
      mutation: { value: n % 3 === 0 ? "sale" : "inheritance", confidence: Math.max(42, confidence - 8) },
    },
    ocrText: `Land record for ${ownerName}, Khasra ${410 + n}/${(n % 3) + 1}, ${village}, ${district}.`,
    lat: (30.84 + n * 0.015).toFixed(6),
    lng: (75.85 + n * 0.02).toFixed(6),
    notes: null,
    uploadedBy: n % 2 ? "Asha Verma" : "District Admin",
    assignedTo: status === "review" || status === "flagged" ? "Review Officer" : null,
    createdAt,
    updatedAt: createdAt,
    verifiedAt: status === "verified" ? new Date(createdAt.getTime() + 86_400_000) : null,
  };
}

function makeAudit(n: number, recordNo: string | null, actor: string, action: string, category: string, daysAgo: number): AuditEvent {
  return {
    id: id(100 + n),
    recordId: recordNo ? id(n) : null,
    recordNo,
    actor,
    action,
    category,
    details: null,
    createdAt: new Date(now - daysAgo * 86_400_000),
  };
}

const initialRecords: LandRecord[] = [
  record(1, "Ramesh Kumar", "Sahnewal", "Ludhiana", "verified", 96, "done"),
  record(2, "Gurpreet Singh", "Dehlon", "Ludhiana", "review", 58, "validation"),
  record(3, "Meena Devi", "Kila Raipur", "Ludhiana", "flagged", 64, "validation"),
  record(4, "Balwinder Singh", "Ghawaddi", "Ludhiana", "verified", 91, "done"),
  record(5, "Harpreet Kaur", "Jodhan", "Ludhiana", "processing", 78, "ocr"),
  record(6, "Suresh Chand", "Verka", "Amritsar", "pending", 52, "preprocess"),
  record(7, "Amandeep Gill", "Kathu Nangal", "Amritsar", "verified", 88, "done"),
  record(8, "Kamal Sharma", "Jandiala Guru", "Amritsar", "review", 61, "validation"),
  record(9, "Simran Kaur", "Nabha", "Patiala", "verified", 94, "done"),
  record(10, "Mohan Lal", "Ghanaur", "Patiala", "rejected", 49, "done"),
  record(11, "Jaspreet Singh", "Kartarpur", "Jalandhar", "verified", 86, "done"),
  record(12, "Poonam Rani", "Adampur", "Jalandhar", "pending", 57, "upload"),
];

const initialAudits: AuditEvent[] = initialRecords.flatMap((r, i) => [
  makeAudit(i + 1, r.recordNo, r.uploadedBy, "Document ingested", "ingest", i + 1),
  ...(r.status === "verified" ? [makeAudit(i + 40, r.recordNo, "Asha Verma", "Record verified", "review", i)] : []),
]);

const initialNotifications: Notification[] = [
  { id: id(201), type: "warning", title: "Review queue needs attention", body: "Records with low AI confidence are ready for verification.", recordId: id(2), recordNo: "LR-2025-032", readAt: null, createdAt: new Date(now - 30 * 60_000) },
  { id: id(202), type: "success", title: "Record auto-verified", body: "AI confidence exceeded the straight-through threshold.", recordId: id(1), recordNo: "LR-2025-031", readAt: null, createdAt: new Date(now - 2 * 3_600_000) },
  { id: id(203), type: "info", title: "Cadastral sync completed", body: "District overlays are ready on the GIS map.", recordId: null, recordNo: null, readAt: null, createdAt: new Date(now - 5 * 3_600_000) },
];

export const localData = state.__bhulekhLocalData ?? {
  records: initialRecords,
  audits: initialAudits,
  notifications: initialNotifications,
};
state.__bhulekhLocalData = localData;

export function localRecord(idOrNo: string) {
  return localData.records.find((r) => r.id === idOrNo || r.recordNo === idOrNo);
}

export function addLocalRecord(record: LandRecord) {
  localData.records.unshift(record);
  return record;
}

export function removeLocalRecord(recordId: string) {
  const index = localData.records.findIndex((r) => r.id === recordId);
  if (index < 0) return false;
  localData.records.splice(index, 1);
  return true;
}

export function addLocalAudit(entry: Omit<AuditEvent, "id" | "createdAt">) {
  localData.audits.unshift({ ...entry, id: randomUUID(), createdAt: new Date() });
}

export function addLocalNotification(entry: Omit<Notification, "id" | "createdAt" | "readAt">) {
  localData.notifications.unshift({ ...entry, id: randomUUID(), readAt: null, createdAt: new Date() });
}
