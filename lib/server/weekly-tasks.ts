export type WeeklyControlPayload = {
  checks?: Record<string, string>;
  notes?: Record<string, string>;
  padThickness?: { front?: string; rear?: string };
  licenceNumber?: string;
  damageState?: string;
  damageNotes?: string;
};

export type WeeklyTask = {
  title: string;
  category: string;
  detail: string;
};

const weeklyCheckRules: Array<{
  when: (payload: WeeklyControlPayload) => boolean;
  title: string;
  category: string;
  noteKey?: string;
  fallbackDetail: string;
}> = [
  {
    when: (payload) => payload.checks?.frontTyres === "problem",
    title: "Problème sur les pneus avant",
    category: "Pneumatiques",
    noteKey: "frontTyres",
    fallbackDetail: "Anomalie relevée lors du contrôle hebdomadaire",
  },
  {
    when: (payload) => payload.checks?.rearTyres === "problem",
    title: "Problème sur les pneus arrière",
    category: "Pneumatiques",
    noteKey: "rearTyres",
    fallbackDetail: "Anomalie relevée lors du contrôle hebdomadaire",
  },
  {
    when: (payload) => payload.checks?.lights === "problem",
    title: "Problème sur les feux",
    category: "Feux et signalisation",
    noteKey: "lights",
    fallbackDetail: "Anomalie relevée lors du contrôle hebdomadaire",
  },
  {
    when: (payload) => payload.checks?.mirrors === "problem",
    title: "Problème sur les rétroviseurs",
    category: "Rétroviseurs",
    noteKey: "mirrors",
    fallbackDetail: "Anomalie relevée lors du contrôle hebdomadaire",
  },
  {
    when: (payload) => payload.checks?.parkingBrake === "problem",
    title: "Problème de frein à main",
    category: "Freinage",
    noteKey: "parkingBrake",
    fallbackDetail: "Anomalie relevée lors du contrôle hebdomadaire",
  },
  {
    when: (payload) => payload.checks?.dashboard === "problem",
    title: "Voyant tableau de bord allumé",
    category: "Voyant tableau de bord",
    noteKey: "dashboard",
    fallbackDetail: "Anomalie relevée lors du contrôle hebdomadaire",
  },
  {
    when: (payload) => payload.checks?.technicalInspection === "no",
    title: "Contrôle technique non conforme",
    category: "Document ou conformité",
    noteKey: "technicalInspection",
    fallbackDetail: "Le contrôle technique n'est plus à jour",
  },
  {
    when: (payload) => payload.checks?.licence === "no",
    title: "Licence absente",
    category: "Document ou conformité",
    fallbackDetail: "La licence n'était pas présente dans le véhicule",
  },
  {
    when: (payload) => payload.damageState === "problem",
    title: "Dégât constaté sur la carrosserie",
    category: "Carrosserie ou vitrage",
    fallbackDetail: "Anomalie relevée lors du contrôle hebdomadaire",
  },
];

function padTask(axle: "avant" | "arrière", thickness: number): WeeklyTask {
  return {
    title: `Plaquettes ${axle} à ${thickness} mm`,
    category: "Freinage",
    detail: "Seuil atelier atteint",
  };
}

export function deriveWeeklyTasks(payload: WeeklyControlPayload) {
  const notes = payload.notes ?? {};
  const tasks: WeeklyTask[] = weeklyCheckRules
    .filter((rule) => rule.when(payload))
    .map((rule) => ({
      title: rule.title,
      category: rule.category,
      detail: (rule.noteKey ? notes[rule.noteKey]?.trim() : payload.damageNotes?.trim()) || rule.fallbackDetail,
    }));

  const frontPads = Number(payload.padThickness?.front);
  const rearPads = Number(payload.padThickness?.rear);
  if (Number.isFinite(frontPads) && frontPads <= 3) tasks.push(padTask("avant", frontPads));
  if (Number.isFinite(rearPads) && rearPads <= 3) tasks.push(padTask("arrière", rearPads));

  return tasks;
}
