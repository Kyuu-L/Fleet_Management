export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatKm(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} km`;
}

export type NextOperationInput = {
  mileage: number;
  now: Date;
  recurrenceKm: number | null;
  recurrenceMonths: number | null;
};

export type NextOperation = {
  dueKm: number | null;
  dueDate: string | null;
  nextDetail: string;
};

export function computeNextOperation(input: NextOperationInput): NextOperation | null {
  if (!input.recurrenceKm && !input.recurrenceMonths) return null;

  const dueKm = input.recurrenceKm ? input.mileage + input.recurrenceKm : null;
  let dueDate: string | null = null;
  let dueDateValue: Date | null = null;
  if (input.recurrenceMonths) {
    dueDateValue = new Date(input.now);
    dueDateValue.setUTCMonth(dueDateValue.getUTCMonth() + input.recurrenceMonths);
    dueDate = dueDateValue.toISOString().slice(0, 10);
  }

  const nextDetail = dueKm
    ? `Prévue à ${formatKm(dueKm)} · calculée depuis le kilométrage réalisé`
    : `À réaliser avant le ${formatDate(dueDateValue!)} · calculée depuis la date réalisée`;

  return { dueKm, dueDate, nextDetail };
}