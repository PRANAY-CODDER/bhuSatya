import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/* ---------------------------------- users --------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("reviewer"), // admin | reviewer | officer
  color: text("color").notNull().default("#10b981"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ------------------------------- land records ------------------------------ */

export const landRecords = pgTable(
  "land_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordNo: text("record_no").notNull().unique(),
    ownerName: text("owner_name").notNull(),
    fatherName: text("father_name"),
    khasraNo: text("khasra_no").notNull(),
    village: text("village").notNull(),
    district: text("district").notNull(),
    state: text("state").notNull().default("Punjab"),
    areaValue: numeric("area_value", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    areaUnit: text("area_unit").notNull().default("acres"),
    landType: text("land_type").notNull().default("agricultural"),
    mutationType: text("mutation_type").notNull().default("inheritance"),
    sourceDoc: text("source_doc").notNull().default("Jamabandi"),
    status: text("status").notNull().default("pending"),
    // pending | processing | review | verified | rejected | flagged
    stage: text("stage").notNull().default("validation"),
    // upload | preprocess | ocr | ai | validation | done
    confidence: integer("confidence").notNull().default(0),
    extracted: jsonb("extracted").$type<Record<string, unknown>>().notNull().default({}),
    ocrText: text("ocr_text"),
    lat: numeric("lat", { precision: 10, scale: 6 }),
    lng: numeric("lng", { precision: 10, scale: 6 }),
    notes: text("notes"),
    uploadedBy: text("uploaded_by").notNull().default("system"),
    assignedTo: text("assigned_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_records_status").on(t.status),
    index("idx_records_district").on(t.district),
    index("idx_records_created").on(t.createdAt),
  ],
);

/* ------------------------------- audit events ------------------------------ */

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordId: uuid("record_id").references(() => landRecords.id, {
      onDelete: "cascade",
    }),
    recordNo: text("record_no"),
    actor: text("actor").notNull().default("system"),
    action: text("action").notNull(),
    category: text("category").notNull().default("system"),
    // ingest | preprocess | ocr | ai | review | export | system
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("idx_audit_created").on(t.createdAt)],
);

/* ------------------------------- notifications ----------------------------- */

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull().default("info"), // info | success | warning | error
  title: text("title").notNull(),
  body: text("body"),
  recordId: uuid("record_id"),
  recordNo: text("record_no"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type LandRecord = typeof landRecords.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
