import type { getD1 } from "@/db";

type D1Database = ReturnType<typeof getD1>;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    name text NOT NULL,
    initials text NOT NULL,
    role text NOT NULL,
    pin_hash text NOT NULL,
    login_enabled integer DEFAULT 0 NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token text PRIMARY KEY NOT NULL,
    user_id integer NOT NULL,
    expires_at text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS vehicles (
    id integer PRIMARY KEY NOT NULL,
    plate text NOT NULL,
    label text NOT NULL,
    km integer NOT NULL,
    status text DEFAULT 'Disponible' NOT NULL,
    maintenance text DEFAULT 'À jour' NOT NULL,
    image text NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS vehicles_plate_unique ON vehicles (plate)`,
  `CREATE TABLE IF NOT EXISTS mileage_logs (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    vehicle_id integer NOT NULL,
    user_id integer NOT NULL,
    km integer NOT NULL,
    source text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS weekly_controls (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    vehicle_id integer NOT NULL,
    user_id integer NOT NULL,
    mileage integer NOT NULL,
    answers text NOT NULL,
    comment text DEFAULT '' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS issues (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    vehicle_id integer NOT NULL,
    created_by integer NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    description text DEFAULT '' NOT NULL,
    mileage integer NOT NULL,
    urgent integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'todo' NOT NULL,
    source text DEFAULT 'report' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at text,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS operations (
    id text PRIMARY KEY NOT NULL,
    vehicle_id integer NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    detail text NOT NULL,
    status text DEFAULT 'todo' NOT NULL,
    completed_by text,
    completed_date text,
    completed_km integer,
    comment text,
    recurrence_km integer,
    recurrence_months integer,
    due_km integer,
    due_date text,
    source_issue_id integer,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (source_issue_id) REFERENCES issues(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    owner_type text NOT NULL,
    owner_id integer NOT NULL,
    object_key text NOT NULL,
    filename text NOT NULL,
    content_type text NOT NULL,
    position integer DEFAULT 0 NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS photos_object_key_unique ON photos (object_key)`,
  `CREATE TABLE IF NOT EXISTS maintenance_plans (
    id text PRIMARY KEY NOT NULL,
    scope text NOT NULL,
    model_id text,
    vehicle_id integer,
    title text NOT NULL,
    category text NOT NULL,
    recurrence_km integer,
    recurrence_months integer,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
];

async function ensureColumn(db: D1Database, table: string, column: string, definition: string) {
  const info = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!info.results.some((entry) => entry.name === column)) {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

export async function ensureSchema(db: D1Database) {
  await db.batch(schemaStatements.map((sql) => db.prepare(sql)));
  await ensureColumn(db, "vehicles", "model_id", "text");
  await ensureColumn(db, "operations", "plan_id", "text");
}