import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: text("role").notNull(),
  pinHash: text("pin_hash").notNull(),
  loginEnabled: integer("login_enabled").notNull().default(0),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey(),
  plate: text("plate").notNull(),
  label: text("label").notNull(),
  km: integer("km").notNull(),
  status: text("status").notNull().default("Disponible"),
  maintenance: text("maintenance").notNull().default("À jour"),
  image: text("image").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("vehicles_plate_unique").on(table.plate)]);

export const mileageLogs = sqliteTable("mileage_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  km: integer("km").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const weeklyControls = sqliteTable("weekly_controls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  mileage: integer("mileage").notNull(),
  answers: text("answers").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const issues = sqliteTable("issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  mileage: integer("mileage").notNull(),
  urgent: integer("urgent").notNull().default(0),
  status: text("status").notNull().default("todo"),
  source: text("source").notNull().default("report"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedAt: text("resolved_at"),
});

export const operations = sqliteTable("operations", {
  id: text("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  detail: text("detail").notNull(),
  status: text("status").notNull().default("todo"),
  completedBy: text("completed_by"),
  completedDate: text("completed_date"),
  completedKm: integer("completed_km"),
  comment: text("comment"),
  recurrenceKm: integer("recurrence_km"),
  recurrenceMonths: integer("recurrence_months"),
  dueKm: integer("due_km"),
  dueDate: text("due_date"),
  sourceIssueId: integer("source_issue_id").references(() => issues.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const photos = sqliteTable("photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerType: text("owner_type").notNull(),
  ownerId: integer("owner_id").notNull(),
  objectKey: text("object_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("photos_object_key_unique").on(table.objectKey)]);
