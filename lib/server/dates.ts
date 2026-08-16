export function todayLabel(now = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(now);
}

export function currentWeekLabel(now = new Date()) {
  const monday = new Date(now);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  return `Semaine du ${formatter.format(monday)} au ${formatter.format(sunday)}`;
}
