export type ScheduledOperation = {
  done: boolean;
  dueKm?: number;
  dueDate?: string;
};

export const maintenanceLeadKm = 3000;
export const maintenanceLeadDays = 30;

export function isMaintenanceActionable(operation: ScheduledOperation, currentKm: number, now = new Date()) {
  if (operation.done) return false;

  const hasKmDeadline = typeof operation.dueKm === "number";
  const hasDateDeadline = Boolean(operation.dueDate);
  if (!hasKmDeadline && !hasDateDeadline) return true;

  const dueByKm = hasKmDeadline && operation.dueKm! - currentKm <= maintenanceLeadKm;
  let dueByDate = false;
  if (operation.dueDate) {
    const deadline = new Date(`${operation.dueDate}T00:00:00Z`);
    const alertDate = new Date(now);
    alertDate.setUTCDate(alertDate.getUTCDate() + maintenanceLeadDays);
    dueByDate = Number.isNaN(deadline.getTime()) || deadline <= alertDate;
  }

  return dueByKm || dueByDate;
}
