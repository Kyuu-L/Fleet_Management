import { isMaintenanceActionable } from "../maintenance.ts";

export type MaintenanceOperation = {
  title: string;
  category: string;
  done: boolean;
  dueKm?: number | null;
  dueDate?: string | null;
};

function shortMaintenanceTitle(title: string, category: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("vidange")) return "Vidange";
  if (normalized.includes("contrôle technique")) return "Contrôle technique";
  if (normalized.includes("révision")) return "Révision";
  if (category === "Pneumatiques") return "Pneus";
  if (category === "Urgent") return title;
  return title;
}

function formatKm(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function computeMaintenanceLabel(
  vehicleKm: number,
  vehicleStatus: string,
  operations: MaintenanceOperation[],
  now = new Date(),
) {
  const pending = operations.filter((operation) => !operation.done);
  const urgent = pending.find((operation) => operation.category === "Urgent");
  if (vehicleStatus === "HS" && urgent) return shortMaintenanceTitle(urgent.title, urgent.category);

  type Candidate = { priority: number; label: string; operation: MaintenanceOperation };
  const candidates: Candidate[] = [];

  for (const operation of pending) {
    if (typeof operation.dueKm === "number") {
      const remaining = operation.dueKm - vehicleKm;
      const shortTitle = shortMaintenanceTitle(operation.title, operation.category);
      if (remaining <= 0) {
        candidates.push({ priority: remaining, label: `${shortTitle} dépassée`, operation });
      } else {
        candidates.push({ priority: remaining, label: `${shortTitle} dans ${formatKm(remaining)} km`, operation });
      }
      continue;
    }

    if (operation.dueDate) {
      const deadline = new Date(`${operation.dueDate}T00:00:00Z`);
      const days = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
      const shortTitle = shortMaintenanceTitle(operation.title, operation.category);
      if (days < 0) {
        candidates.push({ priority: days, label: `${shortTitle} dépassé`, operation });
      } else {
        candidates.push({ priority: days, label: `${shortTitle} dans ${days} j`, operation });
      }
    }
  }

  if (candidates.length === 0) return "À jour";

  candidates.sort((left, right) => left.priority - right.priority);
  const nearest = candidates[0];
  const actionable = isMaintenanceActionable(
    { done: false, dueKm: nearest.operation.dueKm ?? undefined, dueDate: nearest.operation.dueDate ?? undefined },
    vehicleKm,
    now,
  );

  if (actionable || nearest.priority <= 0) return nearest.label;
  return "À jour";
}
