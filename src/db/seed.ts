import "dotenv/config";
import { scryptSync, randomBytes } from "crypto";
import { db } from "./index";
import { auditEvents, landRecords, notifications, users } from "./schema";
import { count } from "drizzle-orm";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/* ------------------------------- source data ------------------------------- */

const VILLAGES: { village: string; district: string; lat: number; lng: number }[] = [
  { village: "Sahnewal", district: "Ludhiana", lat: 30.844, lng: 75.976 },
  { village: "Dehlon", district: "Ludhiana", lat: 30.867, lng: 75.991 },
  { village: "Kila Raipur", district: "Ludhiana", lat: 30.762, lng: 75.815 },
  { village: "Ghawaddi", district: "Ludhiana", lat: 30.901, lng: 75.922 },
  { village: "Jodhan", district: "Ludhiana", lat: 30.786, lng: 75.538 },
  { village: "Verka", district: "Amritsar", lat: 31.662, lng: 74.93 },
  { village: "Kathu Nangal", district: "Amritsar", lat: 31.748, lng: 74.782 },
  { village: "Jandiala Guru", district: "Amritsar", lat: 31.561, lng: 75.027 },
  { village: "Nabha", district: "Patiala", lat: 30.377, lng: 76.147 },
  { village: "Ghanaur", district: "Patiala", lat: 30.329, lng: 76.613 },
  { village: "Kartarpur", district: "Jalandhar", lat: 31.44, lng: 75.5 },
  { village: "Adampur", district: "Jalandhar", lat: 31.432, lng: 75.715 },
  { village: "Goniana", district: "Bathinda", lat: 30.316, lng: 74.91 },
  { village: "Rampura Phul", district: "Bathinda", lat: 30.258, lng: 75.241 },
  { village: "Kharar", district: "S.A.S. Nagar", lat: 30.746, lng: 76.648 },
  { village: "Zirakpur", district: "S.A.S. Nagar", lat: 30.642, lng: 76.817 },
];

const OWNERS: [string, string][] = [
  ["Ramesh Kumar", "Sh. Baldev Singh"],
  ["Harpreet Singh", "Sh. Gurcharan Singh"],
  ["Gurmeet Kaur", "Sh. Joginder Singh"],
  ["Sukhwinder Singh", "Sh. Mohan Singh"],
  ["Baljit Kaur", "Sh. Karam Chand"],
  ["Amandeep Singh Gill", "Sh. Surjit Singh Gill"],
  ["Rajinder Pal", "Sh. Des Raj"],
  ["Manpreet Kaur", "Sh. Harbhajan Singh"],
  ["Jaswinder Singh", "Sh. Ajit Singh"],
  ["Paramjit Kaur", "Sh. Daljit Singh"],
  ["Kuldeep Singh Brar", "Sh. Gurnam Singh Brar"],
  ["Satnam Kaur", "Sh. Inderjit Singh"],
  ["Davinder Kumar", "Sh. Om Prakash"],
  ["Navdeep Singh", "Sh. Ranjit Singh"],
  ["Simran Kaur Dhillon", "Sh. Harjinder Singh Dhillon"],
  ["Charanjit Singh", "Sh. Pritam Singh"],
  ["Amarjeet Kaur", "Sh. Sohan Singh"],
  ["Gurpreet Singh Sidhu", "Sh. Jagtar Singh Sidhu"],
  ["Kamaljeet Kaur", "Sh. Swaran Singh"],
  ["Mohinder Pal Singh", "Sh. Kartar Singh"],
  ["Ravneet Kaur", "Sh. Gurdial Singh"],
  ["Sukhdev Singh", "Sh. Tara Singh"],
  ["Jaspal Kaur", "Sh. Nirmal Singh"],
  ["Harbhajan Singh", "Sh. Milkha Singh"],
  ["Daljeet Kaur", "Sh. Avtar Singh"],
  ["Gurnam Singh", "Sh. Hazara Singh"],
  ["Parmod Kumar", "Sh. Tilak Raj"],
  ["Balwinder Singh", "Sh. Jarnail Singh"],
  ["Kulwinder Kaur", "Sh. Bhupinder Singh"],
  ["Sarabjit Singh", "Sh. Angrej Singh"],
  ["Manjit Kaur", "Sh. Bachan Singh"],
  ["Hardeep Singh", "Sh. Major Singh"],
  ["Rupinder Kaur", "Sh. Gurbachan Singh"],
  ["Tejinder Pal Singh", "Sh. Karnail Singh"],
  ["Lakhwinder Kaur", "Sh. Surinder Singh"],
  ["Gurcharan Singh", "Sh. Waryam Singh"],
  ["Nirmaljit Kaur", "Sh. Sukhchain Singh"],
  ["Bikramjit Singh", "Sh. Piara Singh"],
  ["Amritpal Kaur", "Sh. Dhanna Singh"],
  ["Jagdeep Singh Mann", "Sh. Resham Singh Mann"],
];

const SOURCE_DOCS = ["Jamabandi", "Khatoni", "Sale Deed", "Mutation Record", "Fard", "Registry Copy"];
const MUTATIONS = ["inheritance", "sale", "gift", "partition", "will"];
const LAND_TYPES = ["agricultural", "agricultural", "agricultural", "residential", "orchard", "commercial"];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

async function main() {
  const [{ value: existing }] = await db.select({ value: count() }).from(users);
  if (existing > 0) {
    console.log("Database already seeded — skipping.");
    return;
  }

  /* users */
  const [admin, officer, reviewer, officer2] = await db
    .insert(users)
    .values([
      { name: "Asha Verma", email: "admin@bhulekh.gov.in", passwordHash: hashPassword("admin123"), role: "admin", color: "#ff9933" },
      { name: "Vikram Singh", email: "officer@bhulekh.gov.in", passwordHash: hashPassword("officer123"), role: "reviewer", color: "#10b981" },
      { name: "Priya Nair", email: "priya@bhulekh.gov.in", passwordHash: hashPassword("officer123"), role: "reviewer", color: "#8b5cf6" },
      { name: "Rohit Mehta", email: "rohit@bhulekh.gov.in", passwordHash: hashPassword("officer123"), role: "officer", color: "#3b82f6" },
    ])
    .returning();
  void officer2;

  const actors = [admin.name, officer.name, reviewer.name];
  const rand = rng(20250907);
  const now = Date.now();

  /* records */
  const audits: (typeof auditEvents.$inferInsert)[] = [];
  const records: (typeof landRecords.$inferInsert)[] = [];

  const statusOf = (i: number): string => {
    const r = rand();
    if (r < 0.42) return "verified";
    if (r < 0.62) return "review";
    if (r < 0.72) return "pending";
    if (r < 0.81) return "processing";
    if (r < 0.9) return "flagged";
    return "rejected";
  };

  const TOTAL = 56;
  for (let i = 0; i < TOTAL; i++) {
    const [owner, father] = OWNERS[i % OWNERS.length];
    const v = VILLAGES[i % VILLAGES.length];
    const status = statusOf(i);
    const recordNo = `LR-2025-${String(1000 + i).slice(1)}`;
    const daysBack = Math.floor(Math.pow(rand(), 1.35) * 86);
    const createdAt = new Date(now - daysBack * DAY - Math.floor(rand() * 6 * HOUR) - 3 * HOUR);
    const conf =
      status === "verified" ? 86 + Math.floor(rand() * 13) :
      status === "review" ? 62 + Math.floor(rand() * 25) :
      status === "pending" ? 42 + Math.floor(rand() * 26) :
      status === "processing" ? 30 + Math.floor(rand() * 28) :
      status === "flagged" ? 45 + Math.floor(rand() * 28) :
      20 + Math.floor(rand() * 30);
    const stage =
      status === "verified" || status === "rejected" ? "done" :
      status === "processing" ? ["preprocess", "ocr", "ai"][Math.floor(rand() * 3)] :
      "validation";
    const area = (0.5 + rand() * 7).toFixed(2);
    const khasraNo = `${100 + Math.floor(rand() * 1100)}${rand() > 0.55 ? `/${1 + Math.floor(rand() * 4)}` : ""}`;
    const verifiedAt =
      status === "verified" ? new Date(createdAt.getTime() + (2 + rand() * 40) * HOUR) : null;
    const updatedAt = verifiedAt ?? new Date(createdAt.getTime() + (1 + rand() * 30) * HOUR);

    records.push({
      recordNo,
      ownerName: owner,
      fatherName: father,
      khasraNo,
      village: v.village,
      district: v.district,
      state: "Punjab",
      areaValue: area,
      areaUnit: rand() > 0.3 ? "acres" : "kanals",
      landType: LAND_TYPES[Math.floor(rand() * LAND_TYPES.length)],
      mutationType: MUTATIONS[Math.floor(rand() * MUTATIONS.length)],
      sourceDoc: SOURCE_DOCS[Math.floor(rand() * SOURCE_DOCS.length)],
      status,
      stage,
      confidence: conf,
      extracted: {
        owner: { value: owner, confidence: Math.min(99, conf + Math.floor(rand() * 8)) },
        khasra: { value: khasraNo, confidence: Math.min(99, conf + Math.floor(rand() * 12) - 4) },
        area: { value: area, confidence: Math.max(18, conf + Math.floor(rand() * 14) - 8) },
        village: { value: v.village, confidence: Math.min(99, conf + Math.floor(rand() * 6)) },
        mutation: { value: "", confidence: Math.max(15, conf - Math.floor(rand() * 20)) },
      },
      lat: (v.lat + (rand() - 0.5) * 0.024).toFixed(6),
      lng: (v.lng + (rand() - 0.5) * 0.024).toFixed(6),
      uploadedBy: actors[Math.floor(rand() * actors.length)],
      assignedTo: status === "review" || status === "flagged" ? actors[Math.floor(rand() * actors.length)] : null,
      createdAt,
      updatedAt,
      verifiedAt,
    });

    const t = createdAt.getTime();
    const actor = actors[Math.floor(rand() * actors.length)];
    audits.push(
      { recordNo, actor: "pipeline", action: "Document ingested", category: "ingest", details: `${SOURCE_DOCS[0]} uploaded via bulk channel`, createdAt: new Date(t) },
      { recordNo, actor: "pipeline", action: "Pre-processing completed", category: "preprocess", details: "Deskew + denoise + binarization", createdAt: new Date(t + 4 * MIN) },
      { recordNo, actor: "pipeline", action: "OCR extraction completed", category: "ocr", details: `${(96 + rand() * 3.4).toFixed(1)}% character accuracy`, createdAt: new Date(t + 11 * MIN) },
      { recordNo, actor: "pipeline", action: "AI field extraction finished", category: "ai", details: `Overall confidence ${conf}%`, createdAt: new Date(t + 18 * MIN) },
    );
    if (status === "verified") {
      audits.push({ recordNo, actor, action: `Record verified`, category: "review", details: `Verified by ${actor} at ${conf}% confidence`, createdAt: verifiedAt! });
    } else if (status === "rejected") {
      audits.push({ recordNo, actor, action: "Record rejected", category: "review", details: "Illegible source document — rescan requested", createdAt: updatedAt });
    } else if (status === "flagged") {
      audits.push({ recordNo, actor, action: "Record flagged", category: "review", details: "Boundary mismatch with cadastral map", createdAt: updatedAt });
    } else if (status === "review") {
      audits.push({ recordNo, actor: "pipeline", action: "Routed to review queue", category: "review", details: `Assigned to ${actor}`, createdAt: new Date(t + 30 * MIN) });
    }
    if (rand() > 0.7) {
      audits.push({ recordNo, actor, action: "Exported to district portal", category: "export", details: "Signed PDF + GeoJSON bundle", createdAt: new Date(t + (20 + rand() * 60) * HOUR) });
    }
  }

  /* bulk import + system events to enrich the heatmap */
  for (let d = 3; d < 84; d += 3 + Math.floor(rand() * 6)) {
    const dow = new Date(now - d * DAY).getDay();
    if (dow === 0 || dow === 6) continue;
    const n = 4 + Math.floor(rand() * 11);
    audits.push({
      actor: actors[Math.floor(rand() * actors.length)],
      action: "Bulk CSV import completed",
      category: "ingest",
      details: `${n} records processed`,
      createdAt: new Date(now - d * DAY - rand() * 5 * HOUR),
    });
    if (rand() > 0.5) {
      audits.push({
        actor: "system",
        action: "Duplicate resolution pass",
        category: "system",
        details: `${Math.floor(rand() * 4)} duplicates merged`,
        createdAt: new Date(now - d * DAY - rand() * 7 * HOUR - 2 * HOUR),
      });
    }
  }

  const inserted = await db.insert(landRecords).values(records).returning({ id: landRecords.id, recordNo: landRecords.recordNo });
  const idByNo = new Map(inserted.map((r) => [r.recordNo, r.id]));
  await db.insert(auditEvents).values(
    audits.map((a) => ({ ...a, recordId: a.recordNo ? idByNo.get(a.recordNo) ?? null : null })),
  );

  /* notifications */
  await db.insert(notifications).values([
    { type: "warning", title: "Record LR-2025-044 needs review", body: "Assigned by Asha Verma · confidence below SLA threshold", recordNo: "LR-2025-044", createdAt: new Date(now - 5 * MIN) },
    { type: "success", title: "Record LR-2025-031 auto-verified", body: "AI confidence 96% — straight-through processing", recordNo: "LR-2025-031", createdAt: new Date(now - 58 * MIN) },
    { type: "info", title: "Bulk import completed", body: "47 records processed from ludhiana_batch_12.csv", createdAt: new Date(now - 3 * HOUR) },
    { type: "warning", title: "OCR queue depth above threshold", body: "23 documents waiting — consider scaling workers", createdAt: new Date(now - 6 * HOUR) },
    { type: "error", title: "Duplicate boundary detected", body: "Khasra 411/2 overlaps an existing verified parcel", createdAt: new Date(now - 9 * HOUR) },
    { type: "info", title: "Weekly district report ready", body: "Ludhiana digitization digest — 12,438 parcels mapped", createdAt: new Date(now - 26 * HOUR) },
    { type: "success", title: "GIS sync completed", body: "Cadastral overlays refreshed for 6 districts", createdAt: new Date(now - 30 * HOUR) },
  ]);

  const [{ value: rc }] = await db.select({ value: count() }).from(landRecords);
  console.log(`Seeded ${rc} records, ${audits.length} audit events.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
