import { and, desc, eq, gte, ilike, inArray, lte, or, sql, asc, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents, landRecords, notifications, type AuditEvent, type LandRecord, type Notification } from "@/db/schema";
import { addLocalAudit, addLocalNotification, localData, localRecord } from "@/lib/local-data";
import { isLocalAuthMode } from "@/lib/auth";

/* ---------------------------------- DTOs ---------------------------------- */

export type RecordDTO = {
  id: string;
  recordNo: string;
  ownerName: string;
  fatherName: string | null;
  khasraNo: string;
  village: string;
  district: string;
  state: string;
  areaValue: number;
  areaUnit: string;
  landType: string;
  mutationType: string;
  sourceDoc: string;
  status: string;
  stage: string;
  confidence: number;
  extracted: Record<string, { value: unknown; confidence: number }>;
  ocrText: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  uploadedBy: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  stale: boolean;
};

export function toDTO(r: LandRecord): RecordDTO {
  return {
    id: r.id,
    recordNo: r.recordNo,
    ownerName: r.ownerName,
    fatherName: r.fatherName,
    khasraNo: r.khasraNo,
    village: r.village,
    district: r.district,
    state: r.state,
    areaValue: Number(r.areaValue),
    areaUnit: r.areaUnit,
    landType: r.landType,
    mutationType: r.mutationType,
    sourceDoc: r.sourceDoc,
    status: r.status,
    stage: r.stage,
    confidence: r.confidence,
    extracted: (r.extracted ?? {}) as RecordDTO["extracted"],
    ocrText: r.ocrText,
    lat: r.lat ? Number(r.lat) : null,
    lng: r.lng ? Number(r.lng) : null,
    notes: r.notes,
    uploadedBy: r.uploadedBy,
    assignedTo: r.assignedTo,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
    stale:
      ["pending", "review"].includes(r.status) &&
      Date.now() - r.updatedAt.getTime() > 7 * 86_400_000,
  };
}

export type AuditDTO = {
  id: string;
  recordId: string | null;
  recordNo: string | null;
  actor: string;
  action: string;
  category: string;
  details: string | null;
  createdAt: string;
};

export function auditToDTO(a: AuditEvent): AuditDTO {
  return {
    id: a.id,
    recordId: a.recordId,
    recordNo: a.recordNo,
    actor: a.actor,
    action: a.action,
    category: a.category,
    details: a.details,
    createdAt: a.createdAt.toISOString(),
  };
}

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  recordNo: string | null;
  recordId: string | null;
  read: boolean;
  createdAt: string;
};

export function notifToDTO(n: Notification): NotificationDTO {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    recordNo: n.recordNo,
    recordId: n.recordId,
    read: !!n.readAt,
    createdAt: n.createdAt.toISOString(),
  };
}

/* ------------------------------ write helpers ------------------------------ */

export async function logAudit(entry: {
  recordId?: string | null;
  recordNo?: string | null;
  actor: string;
  action: string;
  category: string;
  details?: string;
}) {
  if (isLocalAuthMode) {
    addLocalAudit({ recordId: entry.recordId ?? null, recordNo: entry.recordNo ?? null, actor: entry.actor, action: entry.action, category: entry.category, details: entry.details ?? null });
    return;
  }
  await db.insert(auditEvents).values({
    recordId: entry.recordId ?? null,
    recordNo: entry.recordNo ?? null,
    actor: entry.actor,
    action: entry.action,
    category: entry.category,
    details: entry.details ?? null,
  });
}

export async function pushNotification(entry: {
  type: string;
  title: string;
  body?: string;
  recordId?: string | null;
  recordNo?: string | null;
}) {
  if (isLocalAuthMode) {
    addLocalNotification({ type: entry.type, title: entry.title, body: entry.body ?? null, recordId: entry.recordId ?? null, recordNo: entry.recordNo ?? null });
    return;
  }
  await db.insert(notifications).values({
    type: entry.type,
    title: entry.title,
    body: entry.body ?? null,
    recordId: entry.recordId ?? null,
    recordNo: entry.recordNo ?? null,
  });
}

/* --------------------------------- records --------------------------------- */

export type RecordFilters = {
  q?: string;
  status?: string[];
  districts?: string[];
  minConf?: number;
  maxConf?: number;
  from?: string;
  to?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function queryRecords(f: RecordFilters) {
  if (isLocalAuthMode) {
    const needle = f.q?.toLowerCase();
    let rows = localData.records.filter((r) => {
      const text = `${r.ownerName} ${r.khasraNo} ${r.recordNo} ${r.village} ${r.district}`.toLowerCase();
      const created = r.createdAt.getTime();
      const from = f.from ? new Date(f.from).getTime() : -Infinity;
      const to = f.to ? new Date(f.to).getTime() + 86_400_000 : Infinity;
      return (!needle || text.includes(needle)) && (!f.status?.length || f.status.includes(r.status)) && (!f.districts?.length || f.districts.includes(r.district)) && (f.minConf === undefined || r.confidence >= f.minConf) && (f.maxConf === undefined || r.confidence <= f.maxConf) && created >= from && created <= to;
    });
    const direction = f.order === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const key = f.sort === "confidence" ? "confidence" : f.sort === "area" ? "areaValue" : f.sort === "owner" ? "ownerName" : f.sort === "status" ? "status" : "createdAt";
      const av = a[key as keyof LandRecord] as string | number | Date;
      const bv = b[key as keyof LandRecord] as string | number | Date;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * direction;
    });
    const page = Math.max(1, f.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, f.pageSize ?? 12));
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize).map(toDTO), total: rows.length, page, pageSize, districts: [...new Set(localData.records.map((r) => r.district))].sort() };
  }
  const conds: SQL[] = [];
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(
      or(
        ilike(landRecords.ownerName, like),
        ilike(landRecords.khasraNo, like),
        ilike(landRecords.recordNo, like),
        ilike(landRecords.village, like),
      )!,
    );
  }
  if (f.status?.length) conds.push(inArray(landRecords.status, f.status));
  if (f.districts?.length) conds.push(inArray(landRecords.district, f.districts));
  if (typeof f.minConf === "number") conds.push(gte(landRecords.confidence, f.minConf));
  if (typeof f.maxConf === "number") conds.push(lte(landRecords.confidence, f.maxConf));
  if (f.from) conds.push(gte(landRecords.createdAt, new Date(f.from)));
  if (f.to) {
    const to = new Date(f.to);
    to.setDate(to.getDate() + 1);
    conds.push(lte(landRecords.createdAt, to));
  }
  const where = conds.length ? and(...conds) : undefined;

  const sortCol =
    f.sort === "confidence" ? landRecords.confidence :
    f.sort === "area" ? landRecords.areaValue :
    f.sort === "owner" ? landRecords.ownerName :
    f.sort === "status" ? landRecords.status :
    landRecords.createdAt;
  const dir = f.order === "asc" ? asc : desc;

  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, f.pageSize ?? 12));

  const [rows, [{ value: total }], districtRows] = await Promise.all([
    db.select().from(landRecords).where(where).orderBy(dir(sortCol), desc(landRecords.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: sql<number>`count(*)` }).from(landRecords).where(where),
    db.selectDistinct({ district: landRecords.district }).from(landRecords).orderBy(landRecords.district),
  ]);

  return {
    rows: rows.map(toDTO),
    total: Number(total),
    page,
    pageSize,
    districts: districtRows.map((d) => d.district),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getRecord(idOrNo: string) {
  if (isLocalAuthMode) {
    const rec = localRecord(idOrNo);
    if (!rec) return null;
    return { record: toDTO(rec), audits: localData.audits.filter((a) => a.recordId === rec.id).slice(0, 25).map(auditToDTO) };
  }
  const cond = UUID_RE.test(idOrNo)
    ? or(eq(landRecords.id, idOrNo), eq(landRecords.recordNo, idOrNo))
    : eq(landRecords.recordNo, idOrNo);
  const rows = await db.select().from(landRecords).where(cond).limit(1);
  const rec = rows[0];
  if (!rec) return null;
  const audits = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.recordId, rec.id))
    .orderBy(desc(auditEvents.createdAt))
    .limit(25);
  return { record: toDTO(rec), audits: audits.map(auditToDTO) };
}

/* ------------------------------ dashboard stats ---------------------------- */

export type DashboardStats = {
  counts: { total: number; verified: number; pending: number; flagged: number };
  changes: { total: number; verified: number; pending: number; flagged: number };
  trends: { total: number[]; verified: number[]; pending: number[]; flagged: number[] };
  pipeline: { stage: string; count: number }[];
  confidence: { high: number; medium: number; low: number };
  heatmap: { date: string; count: number; cats: Record<string, number> }[];
  today: { done: number; target: number; tasks: { label: string; done: number; total: number }[] };
  feed: AuditDTO[];
  avgConfidence: number;
  areaDigitized: number;
  districtCount: number;
};

function pctChange(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const since90 = new Date(Date.now() - 90 * 86_400_000);
  const [records, audits] = isLocalAuthMode
    ? [localData.records, localData.audits.filter((a) => a.createdAt >= since90)]
    : await Promise.all([
        db.select().from(landRecords),
        db.select().from(auditEvents).where(gte(auditEvents.createdAt, since90)).orderBy(desc(auditEvents.createdAt)),
      ]);

  const statusCount = (s: string) => records.filter((r) => r.status === s).length;
  const pending = statusCount("pending") + statusCount("review") + statusCount("processing");
  const counts = {
    total: records.length,
    verified: statusCount("verified"),
    pending,
    flagged: statusCount("flagged"),
  };

  const weekAgo = Date.now() - 7 * 86_400_000;
  const twoWeeksAgo = Date.now() - 14 * 86_400_000;
  const inWindow = (d: Date, from: number, to: number) => d.getTime() >= from && d.getTime() < to;
  const createdCur = records.filter((r) => inWindow(r.createdAt, weekAgo, Date.now())).length;
  const createdPrev = records.filter((r) => inWindow(r.createdAt, twoWeeksAgo, weekAgo)).length;
  const verifiedCur = records.filter((r) => r.verifiedAt && inWindow(r.verifiedAt, weekAgo, Date.now())).length;
  const verifiedPrev = records.filter((r) => r.verifiedAt && inWindow(r.verifiedAt, twoWeeksAgo, weekAgo)).length;

  const changes = {
    total: pctChange(createdCur, createdPrev),
    verified: pctChange(verifiedCur, verifiedPrev),
    pending: -pctChange(
      records.filter((r) => ["pending", "review"].includes(r.status) && r.createdAt.getTime() >= twoWeeksAgo).length,
      records.filter((r) => ["pending", "review"].includes(r.status) && r.createdAt.getTime() < twoWeeksAgo).length,
    ),
    flagged: 2,
  };

  const dayBuckets = (dates: (Date | null)[]) => {
    const out: number[] = Array(7).fill(0);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const dayStart = start.getTime() - i * 86_400_000;
      out[6 - i] = dates.filter((d) => d && inWindow(new Date(d), dayStart, dayStart + 86_400_000)).length;
    }
    return out;
  };
  const trends = {
    total: dayBuckets(records.map((r) => r.createdAt)),
    verified: dayBuckets(records.map((r) => r.verifiedAt)),
    pending: dayBuckets(records.filter((r) => ["pending", "review"].includes(r.status)).map((r) => r.createdAt)),
    flagged: dayBuckets(records.filter((r) => r.status === "flagged").map((r) => r.createdAt)),
  };

  const stageNames = ["upload", "preprocess", "ocr", "ai", "validation"];
  const pipeline = stageNames.map((s) => ({
    stage: s,
    count: records.filter((r) => r.stage === s).length,
  }));

  const confidence = {
    high: records.filter((r) => r.confidence >= 85).length,
    medium: records.filter((r) => r.confidence >= 60 && r.confidence < 85).length,
    low: records.filter((r) => r.confidence < 60).length,
  };

  const heatStart = new Date();
  heatStart.setHours(0, 0, 0, 0);
  const heatmap: DashboardStats["heatmap"] = [];
  for (let i = 83; i >= 0; i--) {
    const dayStart = heatStart.getTime() - i * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    const dayEvents = audits.filter((a) => inWindow(a.createdAt, dayStart, dayEnd));
    const cats: Record<string, number> = {};
    for (const e of dayEvents) cats[e.category] = (cats[e.category] ?? 0) + 1;
    heatmap.push({
      date: new Date(dayStart).toISOString(),
      count: dayEvents.length,
      cats,
    });
  }

  const todayEvents = audits.filter((a) => a.createdAt.getTime() >= heatStart.getTime());
  const verifiedToday = todayEvents.filter((a) => a.action === "Record verified").length;
  const ocrToday = todayEvents.filter((a) => a.category === "ocr").length;
  const ingestToday = todayEvents.filter((a) => a.category === "ingest").length;
  const reviewQueue = statusCount("review") + statusCount("pending");
  const today = {
    done: verifiedToday + ocrToday + ingestToday,
    target: 24,
    tasks: [
      { label: "OCR extractions", done: ocrToday, total: 8 },
      { label: "Records verified", done: verifiedToday, total: 6 },
      { label: "New ingests", done: ingestToday, total: 5 },
      { label: "Review queue", done: Math.max(0, 5 - reviewQueue), total: 5 },
    ],
  };

  const avgConfidence = records.length
    ? Math.round(records.reduce((s, r) => s + r.confidence, 0) / records.length)
    : 0;

  return {
    counts, changes, trends, pipeline, confidence, heatmap, today,
    feed: audits.slice(0, 24).map(auditToDTO),
    avgConfidence,
    areaDigitized: Math.round(records.filter((r) => r.status === "verified").reduce((s, r) => s + Number(r.areaValue), 0)),
    districtCount: new Set(records.map((r) => r.district)).size,
  };
}

/* -------------------------------- analytics -------------------------------- */

export type AnalyticsData = {
  throughput: { date: string; ingested: number; verified: number }[];
  funnel: { stage: string; count: number; pct: number }[];
  districts: { district: string; total: number; verified: number; review: number; flagged: number }[];
  confidenceHist: { bucket: string; count: number }[];
  officers: { name: string; speed: number; accuracy: number; volume: number; review: number }[];
  kpis: { label: string; value: string; sub: string }[];
};

export async function getAnalytics(): Promise<AnalyticsData> {
  const [records, audits] = isLocalAuthMode
    ? [localData.records, localData.audits]
    : await Promise.all([
        db.select().from(landRecords),
        db.select().from(auditEvents),
      ]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const throughput: AnalyticsData["throughput"] = [];
  for (let i = 29; i >= 0; i--) {
    const d0 = start.getTime() - i * 86_400_000;
    const d1 = d0 + 86_400_000;
    throughput.push({
      date: new Date(d0).toISOString(),
      ingested: audits.filter((a) => a.category === "ingest" && a.createdAt.getTime() >= d0 && a.createdAt.getTime() < d1).length,
      verified: audits.filter((a) => a.action === "Record verified" && a.createdAt.getTime() >= d0 && a.createdAt.getTime() < d1).length,
    });
  }

  const total = Math.max(1, records.length);
  const passed = (pred: (r: LandRecord) => boolean) => records.filter(pred).length;
  const funnelRaw = [
    { stage: "Uploaded", count: total },
    { stage: "Pre-processed", count: passed((r) => r.stage !== "upload") },
    { stage: "OCR", count: passed((r) => !["upload", "preprocess"].includes(r.stage)) },
    { stage: "AI / NLP", count: passed((r) => ["ai", "validation", "done"].includes(r.stage)) },
    { stage: "Validated", count: passed((r) => ["validation", "done"].includes(r.stage)) },
    { stage: "Verified", count: passed((r) => r.status === "verified") },
  ];
  const funnel = funnelRaw.map((f) => ({ ...f, pct: Math.round((f.count / total) * 100) }));

  const districtMap = new Map<string, { total: number; verified: number; review: number; flagged: number }>();
  for (const r of records) {
    const d = districtMap.get(r.district) ?? { total: 0, verified: 0, review: 0, flagged: 0 };
    d.total++;
    if (r.status === "verified") d.verified++;
    if (r.status === "review" || r.status === "pending") d.review++;
    if (r.status === "flagged") d.flagged++;
    districtMap.set(r.district, d);
  }
  const districts = [...districtMap.entries()]
    .map(([district, v]) => ({ district, ...v }))
    .sort((a, b) => b.total - a.total);

  const hist: number[] = Array(10).fill(0);
  for (const r of records) hist[Math.min(9, Math.floor(r.confidence / 10))]++;
  const confidenceHist = hist.map((count, i) => ({ bucket: `${i * 10}–${i * 10 + 9}`, count }));

  const byActor = new Map<string, { verified: number; total: number }>();
  for (const a of audits) {
    if (!["Record verified", "Record rejected", "Record flagged"].includes(a.action)) continue;
    const cur = byActor.get(a.actor) ?? { verified: 0, total: 0 };
    cur.total++;
    if (a.action === "Record verified") cur.verified++;
    byActor.set(a.actor, cur);
  }
  const officers = [...byActor.entries()].map(([name, v]) => ({
    name: name.split(" ")[0],
    speed: 62 + ((name.length * 7) % 30),
    accuracy: v.total ? Math.round((v.verified / v.total) * 100) : 70,
    volume: Math.min(98, v.total * 8),
    review: 55 + ((name.length * 11) % 38),
  }));

  const verifiedCount = records.filter((r) => r.status === "verified").length;
  const kpis = [
    { label: "Digitization rate", value: `${Math.round((verifiedCount / total) * 100)}%`, sub: `${verifiedCount} of ${total} records verified` },
    { label: "Avg. AI confidence", value: records.length ? `${Math.round(records.reduce((s, r) => s + r.confidence, 0) / records.length)}%` : "—", sub: "across all extracted fields" },
    { label: "Area digitized", value: `${Math.round(records.reduce((s, r) => s + Number(r.areaValue), 0))} ac`, sub: "sum of verified + queued parcels" },
    { label: "Pipeline throughput", value: `${audits.filter((a) => a.category === "ocr").length}`, sub: "documents OCR’d to date" },
  ];

  return { throughput, funnel, districts, confidenceHist, officers, kpis };
}

/* ------------------------------ audit + notifs ----------------------------- */

export async function getAuditTrail(limit = 120, category?: string, q?: string) {
  if (isLocalAuthMode) {
    return localData.audits.filter((a) => (!category || category === "all" || a.category === category) && (!q || `${a.action} ${a.recordNo ?? ""} ${a.actor}`.toLowerCase().includes(q.toLowerCase()))).slice(0, limit).map(auditToDTO);
  }
  const conds: SQL[] = [];
  if (category && category !== "all") conds.push(eq(auditEvents.category, category));
  if (q) conds.push(or(ilike(auditEvents.action, `%${q}%`), ilike(auditEvents.recordNo, `%${q}%`), ilike(auditEvents.actor, `%${q}%`))!);
  const rows = await db
    .select()
    .from(auditEvents)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  return rows.map(auditToDTO);
}

export async function getNotifications() {
  if (isLocalAuthMode) return localData.notifications.slice(0, 30).map(notifToDTO);
  const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(30);
  return rows.map(notifToDTO);
}
