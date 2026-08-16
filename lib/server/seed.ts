import { getD1 } from "@/db";
import { ensureSchema } from "./schema-sql";


const demoUsers = [
  [1, "Lucas Martin", "LM", "salarie", "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", 1],
  [2, "Sarah Dupont", "SD", "salarie", "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", 0],
  [3, "Mehdi Laurent", "ML", "salarie", "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", 0],
  [4, "Nina Robert", "NR", "salarie", "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", 0],
  [5, "Julien Morel", "JM", "salarie", "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", 0],
  [6, "Emma Garcia", "EG", "salarie", "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", 0],
  [7, "Hugo Leroy", "HL", "salarie", "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", 0],
  [8, "Chloé Michel", "CM", "salarie", "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c", 0],
  [9, "Thomas Bernard", "TB", "mecano", "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9", 1],
  [10, "Alice Dubois", "AD", "chef", "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69", 1],
] as const;

const demoVehicles = [
  [1, "GA-218-NK", "Renault Master III L2H2 2022", 82460, "Disponible", "Vidange dans 2 540 km", "/vehicles/master-3-l2h2.webp"],
  [2, "FH-704-LP", "Renault Master III L2H2 2022", 116220, "Disponible", "Contrôle technique dans 18 j", "/vehicles/master-3-l2h2.webp"],
  [3, "GJ-391-RT", "Renault Master III L2H2 2022", 44710, "HS", "Freinage à contrôler", "/vehicles/master-3-l2h2.webp"],
  [4, "FT-866-CV", "Renault Master III L2H2 2022", 98730, "Disponible", "À jour", "/vehicles/master-3-l2h2.webp"],
  [5, "GN-143-BD", "Renault Master III L2H2 2022", 63490, "Disponible", "Vidange dans 6 510 km", "/vehicles/master-3-l2h2.webp"],
  [6, "GC-552-MZ", "Mercedes Sprinter W906", 137080, "HS", "Diagnostic en cours", "/vehicles/sprinter-w906.webp"],
  [7, "GA-842-QV", "Renault Master III L2H2 2022", 76240, "Disponible", "À jour", "/vehicles/master-3-l2h2.webp"],
  [8, "GB-317-XD", "Renault Master III L2H2 2022", 89120, "Disponible", "Vidange dans 4 880 km", "/vehicles/master-3-l2h2.webp"],
  [9, "GC-908-HR", "Renault Master III L2H2 2022", 71280, "Disponible", "À jour", "/vehicles/master-3-l2h2.webp"],
  [10, "GD-451-TK", "Renault Master III L2H2 2022", 103640, "Disponible", "Contrôle technique dans 42 j", "/vehicles/master-3-l2h2.webp"],
  [11, "GE-726-PS", "Renault Master III L2H2 2022", 68410, "Disponible", "À jour", "/vehicles/master-3-l2h2.webp"],
  [12, "GF-184-WM", "Renault Master III L2H2 2022", 93780, "Disponible", "Pneus dans 3 000 km", "/vehicles/master-3-l2h2.webp"],
  [13, "GG-639-KL", "Renault Master III L2H2 2022", 57950, "Disponible", "À jour", "/vehicles/master-3-l2h2.webp"],
  [14, "GH-275-VB", "Renault Master III L2H2 2022", 108330, "Disponible", "Vidange dans 1 670 km", "/vehicles/master-3-l2h2.webp"],
  [15, "GJ-814-FN", "Renault Master III L2H2 2022", 85760, "Disponible", "À jour", "/vehicles/master-3-l2h2.webp"],
  [16, "GK-396-CR", "Renault Master III L2H2 2022", 74190, "Disponible", "Contrôle technique dans 63 j", "/vehicles/master-3-l2h2.webp"],
  [17, "HA-423-JS", "Nissan Interstar 2025", 18420, "Disponible", "À jour", "/vehicles/interstar-2025.webp"],
  [18, "HB-758-NQ", "Nissan Interstar 2025", 16380, "Disponible", "À jour", "/vehicles/interstar-2025.webp"],
  [19, "HC-291-ZL", "Nissan Interstar 2025", 21970, "Disponible", "Révision dans 8 030 km", "/vehicles/interstar-2025.webp"],
  [20, "HD-645-BT", "Nissan Interstar 2025", 14260, "Disponible", "À jour", "/vehicles/interstar-2025.webp"],
  [21, "HE-873-MC", "Nissan Interstar 2025", 19640, "Disponible", "À jour", "/vehicles/interstar-2025.webp"],
  [22, "HF-316-RP", "Nissan Interstar 2025", 12780, "Disponible", "À jour", "/vehicles/interstar-2025.webp"],
  [23, "EV-482-DH", "Renault Trafic 2018", 148630, "Disponible", "Vidange dans 1 370 km", "/vehicles/trafic-2018.webp"],
  [24, "EX-719-KM", "Renault Trafic 2018", 132540, "Disponible", "Contrôle technique dans 27 j", "/vehicles/trafic-2018.webp"],
  [25, "HG-954-SV", "Fiat Ducato 2025", 17320, "Disponible", "À jour", "/vehicles/ducato-2025.webp"],
] as const;

const demoIssues = [
  [1, 3, 1, "Freinage", "Bruit important au freinage", "Un bruit métallique se fait entendre au freinage.", 44710, 1, "todo", "report"],
  [2, 2, 2, "Moteur", "Voyant moteur intermittent", "Le voyant apparaît puis disparaît pendant la tournée.", 116220, 0, "todo", "report"],
  [3, 1, 1, "Éclairage", "Éclairage arrière droit", "Ampoule arrière droite hors service.", 82210, 0, "done", "report"],
] as const;

const demoOperations = [
  ["1-1", 1, "Vidange moteur", "Entretien", "Prévue à 85 000 km · tous les 20 000 km", "todo", null, null, null, null, 20000, null, 85000, null, null],
  ["1-2", 1, "Contrôle technique", "Réglementaire", "À réaliser avant le 12 septembre 2026 · renouvellement 24 mois", "todo", null, null, null, null, null, 24, null, "2026-09-12", null],
  ["1-3", 1, "Ampoule arrière droite", "Éclairage", "Réalisée le 14 août à 82 210 km", "done", "Thomas Bernard", "2026-08-14", 82210, null, null, null, null, null, 3],
  ["1-4", 1, "Remplacement des pneus avant", "Pneumatiques", "Réalisé le 22 juin à 78 430 km", "done", "Thomas Bernard", "2026-06-22", 78430, null, null, null, null, null, null],
  ["2-1", 2, "Diagnostiquer le voyant moteur", "Signalement", "Signalé le 14 août par Sarah D.", "todo", null, null, null, null, null, null, null, null, 2],
  ["2-2", 2, "Contrôle technique", "Réglementaire", "À réaliser avant le 2 septembre 2026 · renouvellement 24 mois", "todo", null, null, null, null, null, 24, null, "2026-09-02", null],
  ["2-3", 2, "Révision complète", "Entretien", "Réalisée le 18 juillet à 111 870 km", "done", "Marc Petit", "2026-07-18", 111870, null, null, null, null, null, null],
  ["3-1", 3, "Contrôler le système de freinage", "Urgent", "Véhicule HS · signalé aujourd'hui à 07:42", "todo", null, null, null, null, null, null, null, null, 1],
  ["3-2", 3, "Remplacement des plaquettes arrière", "Freinage", "Réalisé le 4 avril à 38 920 km", "done", "Thomas Bernard", "2026-04-04", 38920, null, null, null, null, null, null],
  ["3-3", 3, "Vidange moteur", "Entretien", "Réalisée le 8 février à 30 170 km", "done", "Marc Petit", "2026-02-08", 30170, null, null, null, null, null, null],
  ["4-1", 4, "Permutation des pneumatiques", "Pneumatiques", "À prévoir avant 100 000 km", "todo", null, null, null, null, null, null, 100000, null, null],
  ["4-2", 4, "Vidange moteur", "Entretien", "Réalisée le 29 juillet à 96 420 km", "done", "Thomas Bernard", "2026-07-29", 96420, null, null, null, null, null, null],
  ["4-3", 4, "Remplacement essuie-glaces", "Équipement", "Réalisé le 3 juin à 89 110 km", "done", "Marc Petit", "2026-06-03", 89110, null, null, null, null, null, null],
  ["5-1", 5, "Vidange moteur", "Entretien", "Prévue à 70 000 km · tous les 20 000 km", "todo", null, null, null, null, 20000, null, 70000, null, null],
  ["5-2", 5, "Contrôle des niveaux", "Entretien", "Réalisé le 11 août à 63 120 km", "done", "Thomas Bernard", "2026-08-11", 63120, null, null, null, null, null, null],
  ["5-3", 5, "Remplacement batterie", "Électricité", "Réalisé le 16 janvier à 51 840 km", "done", "Marc Petit", "2026-01-16", 51840, null, null, null, null, null, null],
  ["6-1", 6, "Finaliser le diagnostic moteur", "Urgent", "Véhicule HS · diagnostic en cours", "todo", null, null, null, null, null, null, null, null, null],
  ["6-2", 6, "Contrôle technique dépassé", "Réglementaire", "Échéance dépassée depuis le 8 août 2026", "todo", null, null, null, null, null, 24, null, "2026-08-08", null],
  ["6-3", 6, "Remplacement courroie accessoires", "Mécanique", "Réalisé le 20 mai à 128 400 km", "done", "Thomas Bernard", "2026-05-20", 128400, null, null, null, null, null, null],
] as const;

function mondayOfCurrentWeek() {
  const date = new Date();
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(7, 0, 0, 0);
  return date;
}

export async function ensureDemoData() {
  const db = getD1();
  await ensureSchema(db);
  const existing = await db.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
  if (Number(existing?.count ?? 0) > 0) return;

  const statements = [
    ...demoUsers.map((row) => db.prepare("INSERT INTO users (id, name, initials, role, pin_hash, login_enabled, active) VALUES (?, ?, ?, ?, ?, ?, 1)").bind(...row)),
    ...demoVehicles.map((row) => db.prepare("INSERT INTO vehicles (id, plate, label, km, status, maintenance, image) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(...row)),
    ...demoIssues.map((row) => db.prepare("INSERT INTO issues (id, vehicle_id, created_by, category, title, description, mileage, urgent, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...row)),
    ...demoOperations.map((row) => db.prepare("INSERT INTO operations (id, vehicle_id, title, category, detail, status, completed_by, completed_date, completed_km, comment, recurrence_km, recurrence_months, due_km, due_date, source_issue_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...row)),
  ];

  const weekStart = mondayOfCurrentWeek();
  const weeklyVehicles = [1, 2, 4, 5];
  for (let index = 0; index < 4; index += 1) {
    const createdAt = new Date(weekStart);
    createdAt.setUTCDate(createdAt.getUTCDate() + index);
    createdAt.setUTCMinutes(16 - (index * 7));
    statements.push(db.prepare("INSERT INTO weekly_controls (vehicle_id, user_id, mileage, answers, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(weeklyVehicles[index], index + 1, demoVehicles[weeklyVehicles[index] - 1][3], "{}", "", createdAt.toISOString()));
  }

  await db.batch(statements);
}
