import { getD1 } from "@/db";
import { currentWeekLabel, todayLabel } from "./dates";
import { computeMaintenanceLabel } from "./maintenance-label";
import { ensureDemoData } from "./seed";

type VehicleRow = {
  id: number;
  plate: string;
  label: string;
  km: number;
  status: "Disponible" | "HS";
  image: string;
};

type IssueRow = {
  id: number;
  plate: string;
  category: string;
  title: string;
  description: string;
  mileage: number;
  urgent: number;
  status: string;
  source: "report" | "weekly";
  createdAt: string;
  createdBy: string;
};

type OperationRow = {
  id: string;
  vehicleId: number;
  title: string;
  category: string;
  detail: string;
  status: string;
  completedBy: string | null;
  completedDate: string | null;
  completedKm: number | null;
  comment: string | null;
  recurrenceKm: number | null;
  recurrenceMonths: number | null;
  dueKm: number | null;
  dueDate: string | null;
};

type ActivityRow = {
  id: string;
  kind: "issue" | "mileage" | "weekly" | "operation";
  plate: string;
  person: string;
  occurredAt: string;
};

type WeeklyHistoryRow = {
  id: number;
  vehicleId: number;
  person: string;
  createdAt: string;
};

function dateLabel(value: string, includeTime = false) {
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date);
  if (!includeTime) return datePart;
  return `${datePart} à ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date)}`;
}

function mondayIso() {
  const date = new Date();
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function activityTime(value: string) {
  const date = new Date(`${value.replace(" ", "T").replace(/Z$/, "")}Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
}

export async function readApplicationState() {
  await ensureDemoData();
  const db = getD1();
  const now = new Date();
  const [vehicleResult, issueResult, operationResult, photoResult, employeeResult, controlResult, historyResult, activityResult] = await Promise.all([
    db.prepare("SELECT id, plate, label, km, status, image FROM vehicles ORDER BY id").all<VehicleRow>(),
    db.prepare(`
      SELECT i.id, v.plate, i.category, i.title, i.description, i.mileage, i.urgent, i.status, i.source,
             i.created_at AS createdAt, u.name AS createdBy
      FROM issues i
      JOIN vehicles v ON v.id = i.vehicle_id
      JOIN users u ON u.id = i.created_by
      ORDER BY i.created_at DESC, i.id DESC
    `).all<IssueRow>(),
    db.prepare(`
      SELECT id, vehicle_id AS vehicleId, title, category, detail, status, completed_by AS completedBy,
             completed_date AS completedDate, completed_km AS completedKm, comment, recurrence_km AS recurrenceKm,
             recurrence_months AS recurrenceMonths, due_km AS dueKm, due_date AS dueDate
      FROM operations
      ORDER BY created_at DESC, id DESC
    `).all<OperationRow>(),
    db.prepare(`
      SELECT id, owner_type AS ownerType, owner_id AS ownerId, filename, position
      FROM photos
      WHERE owner_type IN ('issue', 'weekly_control')
      ORDER BY position, id
    `).all<{ id: number; ownerType: "issue" | "weekly_control"; ownerId: number; filename: string; position: number }>(),
    db.prepare("SELECT id, name, initials FROM users WHERE role = 'salarie' AND active = 1 ORDER BY id").all<{ id: number; name: string; initials: string }>(),
    db.prepare(`
      SELECT wc.user_id AS userId, v.plate, wc.created_at AS createdAt
      FROM weekly_controls wc
      JOIN vehicles v ON v.id = wc.vehicle_id
      WHERE wc.created_at >= ?
      ORDER BY wc.created_at DESC
    `).bind(mondayIso()).all<{ userId: number; plate: string; createdAt: string }>(),
    db.prepare(`
      SELECT wc.id, wc.vehicle_id AS vehicleId, u.name AS person, wc.created_at AS createdAt
      FROM weekly_controls wc
      JOIN users u ON u.id = wc.user_id
      ORDER BY wc.created_at DESC
    `).all<WeeklyHistoryRow>(),
    db.prepare(`
      SELECT 'issue-' || i.id AS id, 'issue' AS kind, v.plate, u.name AS person,
             datetime(i.created_at) AS occurredAt
      FROM issues i
      JOIN vehicles v ON v.id = i.vehicle_id
      JOIN users u ON u.id = i.created_by
      WHERE i.source = 'report'
      UNION ALL
      SELECT 'mileage-' || ml.id AS id,
             CASE WHEN ml.source = 'operation' THEN 'operation' ELSE 'mileage' END AS kind,
             v.plate, u.name AS person, datetime(ml.created_at) AS occurredAt
      FROM mileage_logs ml
      JOIN vehicles v ON v.id = ml.vehicle_id
      JOIN users u ON u.id = ml.user_id
      WHERE ml.source IN ('manual', 'operation')
      UNION ALL
      SELECT 'weekly-' || wc.id AS id, 'weekly' AS kind, v.plate, u.name AS person,
             datetime(wc.created_at) AS occurredAt
      FROM weekly_controls wc
      JOIN vehicles v ON v.id = wc.vehicle_id
      JOIN users u ON u.id = wc.user_id
      ORDER BY occurredAt DESC
      LIMIT 25
    `).all<ActivityRow>(),
  ]);

  const issuePhotos = new Map<number, Array<{ name: string; url: string }>>();
  const weeklyPhotos = new Map<number, Array<{ name: string; url: string }>>();
  for (const photo of photoResult.results) {
    const list = (photo.ownerType === "issue" ? issuePhotos : weeklyPhotos).get(photo.ownerId) ?? [];
    list.push({ name: photo.filename, url: `/api/photos/${photo.id}` });
    if (photo.ownerType === "issue") issuePhotos.set(photo.ownerId, list);
    else weeklyPhotos.set(photo.ownerId, list);
  }

  const issues = issueResult.results.map((issue) => ({
    id: issue.id,
    vehicle: issue.plate,
    title: issue.title,
    meta: `${issue.source === "weekly" ? "Contrôle hebdo" : "Signalé"} · ${dateLabel(issue.createdAt)} · ${issue.createdBy} · ${issue.category}`,
    urgent: Boolean(issue.urgent),
    done: issue.status === "done",
    photos: issuePhotos.get(issue.id) ?? [],
    source: issue.source,
  }));

  const operations: Record<number, Array<Record<string, unknown>>> = {};
  for (const operation of operationResult.results) {
    const list = operations[operation.vehicleId] ?? [];
    list.push({
      id: operation.id,
      title: operation.title,
      category: operation.category,
      detail: operation.detail,
      done: operation.status === "done",
      completedBy: operation.completedBy ?? undefined,
      completedDate: operation.completedDate ? dateLabel(operation.completedDate) : undefined,
      completedKm: operation.completedKm ?? undefined,
      comment: operation.comment ?? undefined,
      recurrenceKm: operation.recurrenceKm ?? undefined,
      recurrenceMonths: operation.recurrenceMonths ?? undefined,
      dueKm: operation.dueKm ?? undefined,
      dueDate: operation.dueDate ?? undefined,
    });
    operations[operation.vehicleId] = list;
  }

  const vehicles = vehicleResult.results.map((vehicle) => ({
    ...vehicle,
    maintenance: computeMaintenanceLabel(
      vehicle.km,
      vehicle.status,
      (operations[vehicle.id] ?? []).map((operation) => ({
        title: String(operation.title),
        category: String(operation.category),
        done: Boolean(operation.done),
        dueKm: typeof operation.dueKm === "number" ? operation.dueKm : null,
        dueDate: typeof operation.dueDate === "string" ? operation.dueDate : null,
      })),
      now,
    ),
  }));

  const latestControls = new Map<number, { plate: string; createdAt: string }>();
  for (const control of controlResult.results) {
    if (!latestControls.has(control.userId)) latestControls.set(control.userId, { plate: control.plate, createdAt: control.createdAt });
  }
  const weeklyChecks = employeeResult.results.map((employee) => {
    const control = latestControls.get(employee.id);
    return {
      name: employee.name,
      initials: employee.initials,
      vehicle: control?.plate ?? "—",
      done: Boolean(control),
      detail: control ? dateLabel(control.createdAt, true) : "Pas encore réalisé",
    };
  });

  const vehicleWeeklyHistory: Record<number, Array<{ id: number; person: string; detail: string; photos: Array<{ name: string; url: string }> }>> = {};
  for (const entry of historyResult.results) {
    const list = vehicleWeeklyHistory[entry.vehicleId] ?? [];
    list.push({
      id: entry.id,
      person: entry.person,
      detail: dateLabel(entry.createdAt, true),
      photos: weeklyPhotos.get(entry.id) ?? [],
    });
    vehicleWeeklyHistory[entry.vehicleId] = list;
  }

  const activityTitles: Record<ActivityRow["kind"], string> = {
    issue: "Problème signalé",
    mileage: "Kilométrage relevé",
    weekly: "Contrôle terminé",
    operation: "Opération atelier réalisée",
  };
  const recentActivity = activityResult.results.map((activity) => ({
    id: activity.id,
    kind: activity.kind,
    title: activityTitles[activity.kind],
    person: activity.person,
    plate: activity.plate,
    time: activityTime(activity.occurredAt),
  }));

  return {
    vehicles,
    issues,
    operations,
    weeklyChecks,
    vehicleWeeklyHistory,
    recentActivity,
    todayLabel: todayLabel(now),
    weekLabel: currentWeekLabel(now),
  };
}
