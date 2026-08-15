"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { preparePhotoFile } from "@/lib/client/photos";

type Role = "salarie" | "mecano" | "chef";
type AppUser = { id: number; name: string; initials: string; role: Role };
type Screen =
  | "home"
  | "vehicles"
  | "vehicle"
  | "mileage"
  | "check"
  | "report"
  | "workshop"
  | "maintenance"
  | "fleet";

type Vehicle = {
  id: number;
  plate: string;
  label: string;
  km: number;
  status: "Disponible" | "HS";
  maintenance: string;
  image: string;
};

type Operation = {
  id: string;
  title: string;
  category: string;
  detail: string;
  done: boolean;
  completedBy?: string;
  completedDate?: string;
  completedKm?: number;
  comment?: string;
  recurrenceKm?: number;
  recurrenceMonths?: number;
  dueKm?: number;
  dueDate?: string;
};

type PhotoPreview = {
  name: string;
  url: string;
  file?: File;
};

type WeeklyCheck = {
  name: string;
  initials: string;
  vehicle: string;
  done: boolean;
  detail: string;
};

type Issue = {
  id: number;
  vehicle: string;
  title: string;
  meta: string;
  urgent: boolean;
  done: boolean;
  photos?: PhotoPreview[];
  source?: "report" | "weekly";
};

type WorkEntry = {
  kind: "operation" | "issue" | "new";
  vehicleId: number;
  operationId?: string;
  issueId?: number;
};

type CheckChoice = {
  value: string;
  label: string;
  tone: "ok" | "adjusted" | "issue";
  issue?: boolean;
  needsNote?: boolean;
};

type CheckItem = {
  id: string;
  category: string;
  title: string;
  hint: string;
  choices: CheckChoice[];
};

const vehicles: Vehicle[] = [
  { id: 1, plate: "GA-218-NK", label: "Renault Master III L2H2 2022", km: 82460, status: "Disponible", maintenance: "Vidange dans 2 540 km", image: "/vehicles/master-3-l2h2.webp" },
  { id: 2, plate: "FH-704-LP", label: "Renault Master III L2H2 2022", km: 116220, status: "Disponible", maintenance: "Contrôle technique dans 18 j", image: "/vehicles/master-3-l2h2.webp" },
  { id: 3, plate: "GJ-391-RT", label: "Renault Master III L2H2 2022", km: 44710, status: "HS", maintenance: "Freinage à contrôler", image: "/vehicles/master-3-l2h2.webp" },
  { id: 4, plate: "FT-866-CV", label: "Renault Master III L2H2 2022", km: 98730, status: "Disponible", maintenance: "À jour", image: "/vehicles/master-3-l2h2.webp" },
  { id: 5, plate: "GN-143-BD", label: "Renault Master III L2H2 2022", km: 63490, status: "Disponible", maintenance: "Vidange dans 6 510 km", image: "/vehicles/master-3-l2h2.webp" },
  { id: 6, plate: "GC-552-MZ", label: "Mercedes Sprinter W906", km: 137080, status: "HS", maintenance: "Diagnostic en cours", image: "/vehicles/sprinter-w906.webp" },
  { id: 7, plate: "GA-842-QV", label: "Renault Master III L2H2 2022", km: 76240, status: "Disponible", maintenance: "À jour", image: "/vehicles/master-3-l2h2.webp" },
  { id: 8, plate: "GB-317-XD", label: "Renault Master III L2H2 2022", km: 89120, status: "Disponible", maintenance: "Vidange dans 4 880 km", image: "/vehicles/master-3-l2h2.webp" },
  { id: 9, plate: "GC-908-HR", label: "Renault Master III L2H2 2022", km: 71280, status: "Disponible", maintenance: "À jour", image: "/vehicles/master-3-l2h2.webp" },
  { id: 10, plate: "GD-451-TK", label: "Renault Master III L2H2 2022", km: 103640, status: "Disponible", maintenance: "Contrôle technique dans 42 j", image: "/vehicles/master-3-l2h2.webp" },
  { id: 11, plate: "GE-726-PS", label: "Renault Master III L2H2 2022", km: 68410, status: "Disponible", maintenance: "À jour", image: "/vehicles/master-3-l2h2.webp" },
  { id: 12, plate: "GF-184-WM", label: "Renault Master III L2H2 2022", km: 93780, status: "Disponible", maintenance: "Pneus dans 3 000 km", image: "/vehicles/master-3-l2h2.webp" },
  { id: 13, plate: "GG-639-KL", label: "Renault Master III L2H2 2022", km: 57950, status: "Disponible", maintenance: "À jour", image: "/vehicles/master-3-l2h2.webp" },
  { id: 14, plate: "GH-275-VB", label: "Renault Master III L2H2 2022", km: 108330, status: "Disponible", maintenance: "Vidange dans 1 670 km", image: "/vehicles/master-3-l2h2.webp" },
  { id: 15, plate: "GJ-814-FN", label: "Renault Master III L2H2 2022", km: 85760, status: "Disponible", maintenance: "À jour", image: "/vehicles/master-3-l2h2.webp" },
  { id: 16, plate: "GK-396-CR", label: "Renault Master III L2H2 2022", km: 74190, status: "Disponible", maintenance: "Contrôle technique dans 63 j", image: "/vehicles/master-3-l2h2.webp" },
  { id: 17, plate: "HA-423-JS", label: "Nissan Interstar 2025", km: 18420, status: "Disponible", maintenance: "À jour", image: "/vehicles/interstar-2025.webp" },
  { id: 18, plate: "HB-758-NQ", label: "Nissan Interstar 2025", km: 16380, status: "Disponible", maintenance: "À jour", image: "/vehicles/interstar-2025.webp" },
  { id: 19, plate: "HC-291-ZL", label: "Nissan Interstar 2025", km: 21970, status: "Disponible", maintenance: "Révision dans 8 030 km", image: "/vehicles/interstar-2025.webp" },
  { id: 20, plate: "HD-645-BT", label: "Nissan Interstar 2025", km: 14260, status: "Disponible", maintenance: "À jour", image: "/vehicles/interstar-2025.webp" },
  { id: 21, plate: "HE-873-MC", label: "Nissan Interstar 2025", km: 19640, status: "Disponible", maintenance: "À jour", image: "/vehicles/interstar-2025.webp" },
  { id: 22, plate: "HF-316-RP", label: "Nissan Interstar 2025", km: 12780, status: "Disponible", maintenance: "À jour", image: "/vehicles/interstar-2025.webp" },
  { id: 23, plate: "EV-482-DH", label: "Renault Trafic 2018", km: 148630, status: "Disponible", maintenance: "Vidange dans 1 370 km", image: "/vehicles/trafic-2018.webp" },
  { id: 24, plate: "EX-719-KM", label: "Renault Trafic 2018", km: 132540, status: "Disponible", maintenance: "Contrôle technique dans 27 j", image: "/vehicles/trafic-2018.webp" },
  { id: 25, plate: "HG-954-SV", label: "Fiat Ducato 2025", km: 17320, status: "Disponible", maintenance: "À jour", image: "/vehicles/ducato-2025.webp" },
];

const roleLabels: Record<Role, string> = {
  salarie: "Salarié",
  mecano: "Mécanicien",
  chef: "Chef",
};

const roleInitials: Record<Role, string> = {
  salarie: "LM",
  mecano: "TB",
  chef: "AD",
};

const okProblemChoices: CheckChoice[] = [
  { value: "ok", label: "OK", tone: "ok" },
  { value: "problem", label: "Problème", tone: "issue", issue: true, needsNote: true },
];

const okAdjustedChoices: CheckChoice[] = [
  { value: "ok", label: "OK", tone: "ok" },
  { value: "adjusted", label: "Ajusté", tone: "adjusted" },
];

const checkItems: CheckItem[] = [
  { id: "tyrePressure", category: "Pneus", title: "Pression des pneus", hint: "Contrôlez et ajustez la pression si nécessaire", choices: okAdjustedChoices },
  { id: "frontTyres", category: "Pneus", title: "État des pneus avant", hint: "Usure, coupure, hernie ou corps étranger", choices: okProblemChoices },
  { id: "rearTyres", category: "Pneus", title: "État des pneus arrière", hint: "Usure, coupure, hernie ou corps étranger", choices: okProblemChoices },
  { id: "lights", category: "Équipements", title: "Feux", hint: "Position, croisement, route, stop, clignotants et warnings", choices: okProblemChoices },
  { id: "mirrors", category: "Équipements", title: "Rétroviseurs", hint: "Présence, fixation, réglage et état des miroirs", choices: okProblemChoices },
  { id: "parkingBrake", category: "Freinage", title: "Frein à main", hint: "Course et maintien du véhicule", choices: okProblemChoices },
  { id: "dashboard", category: "Conduite", title: "Voyants du tableau de bord", hint: "Aucun voyant d'alerte après démarrage", choices: okProblemChoices },
  { id: "oil", category: "Niveaux", title: "Niveau d'huile", hint: "Niveau vérifié sur sol plat", choices: okAdjustedChoices },
  { id: "coolant", category: "Niveaux", title: "Liquide de refroidissement", hint: "Niveau entre les repères mini et maxi", choices: okAdjustedChoices },
  { id: "brakeFluid", category: "Niveaux", title: "Liquide de frein", hint: "Niveau entre les repères mini et maxi", choices: okAdjustedChoices },
  { id: "washerFluid", category: "Niveaux", title: "Liquide lave-glace", hint: "Réservoir suffisamment rempli", choices: okAdjustedChoices },
  { id: "technicalInspection", category: "Conformité", title: "Contrôle technique à jour", hint: "Vérifiez la date figurant sur le procès-verbal", choices: [{ value: "yes", label: "Oui", tone: "ok" }, { value: "no", label: "Non", tone: "issue", issue: true }] },
];

const damagePhotoSlots = [
  { id: "front", label: "Vue avant" },
  { id: "rear", label: "Vue arrière" },
  { id: "left", label: "Côté gauche" },
  { id: "right", label: "Côté droit" },
];

const issueCategories = [
  "Pneus",
  "Freinage",
  "Feux et signalisation",
  "Rétroviseurs",
  "Voyant tableau de bord",
  "Niveaux ou fuite",
  "Carrosserie ou vitrage",
  "Moteur ou comportement routier",
  "Document ou conformité",
  "Autre",
];

const totalCheckCount = checkItems.length + 5;

const issueSeed: Issue[] = [
  { id: 1, vehicle: "GJ-391-RT", title: "Bruit important au freinage", meta: "Signalé aujourd'hui à 07:42 · Lucas M.", urgent: true, done: false, source: "report" },
  { id: 2, vehicle: "FH-704-LP", title: "Voyant moteur intermittent", meta: "Signalé hier à 16:18 · Sarah D.", urgent: false, done: false, source: "report" },
  { id: 3, vehicle: "GA-218-NK", title: "Éclairage arrière droit", meta: "Traité le 14 août · Thomas B.", urgent: false, done: true, source: "report" },
];

const operationsSeed: Record<number, Operation[]> = {
  1: [
    { id: "1-1", title: "Vidange moteur", category: "Entretien", detail: "Prévue à 85 000 km · tous les 20 000 km", done: false, dueKm: 85000, recurrenceKm: 20000 },
    { id: "1-2", title: "Contrôle technique", category: "Réglementaire", detail: "À réaliser avant le 12 septembre 2026 · renouvellement 24 mois", done: false, dueDate: "2026-09-12", recurrenceMonths: 24 },
    { id: "1-3", title: "Ampoule arrière droite", category: "Éclairage", detail: "Réalisée le 14 août à 82 210 km", done: true, completedBy: "Thomas Bernard" },
    { id: "1-4", title: "Remplacement des pneus avant", category: "Pneumatiques", detail: "Réalisé le 22 juin à 78 430 km", done: true, completedBy: "Thomas Bernard" },
  ],
  2: [
    { id: "2-1", title: "Diagnostiquer le voyant moteur", category: "Signalement", detail: "Signalé le 14 août par Sarah D.", done: false },
    { id: "2-2", title: "Contrôle technique", category: "Réglementaire", detail: "À réaliser avant le 2 septembre 2026 · renouvellement 24 mois", done: false, dueDate: "2026-09-02", recurrenceMonths: 24 },
    { id: "2-3", title: "Révision complète", category: "Entretien", detail: "Réalisée le 18 juillet à 111 870 km", done: true, completedBy: "Marc Petit" },
  ],
  3: [
    { id: "3-1", title: "Contrôler le système de freinage", category: "Urgent", detail: "Véhicule HS · signalé aujourd'hui à 07:42", done: false },
    { id: "3-2", title: "Remplacement des plaquettes arrière", category: "Freinage", detail: "Réalisé le 4 avril à 38 920 km", done: true, completedBy: "Thomas Bernard" },
    { id: "3-3", title: "Vidange moteur", category: "Entretien", detail: "Réalisée le 8 février à 30 170 km", done: true, completedBy: "Marc Petit" },
  ],
  4: [
    { id: "4-1", title: "Permutation des pneumatiques", category: "Pneumatiques", detail: "À prévoir avant 100 000 km", done: false },
    { id: "4-2", title: "Vidange moteur", category: "Entretien", detail: "Réalisée le 29 juillet à 96 420 km", done: true, completedBy: "Thomas Bernard" },
    { id: "4-3", title: "Remplacement essuie-glaces", category: "Équipement", detail: "Réalisé le 3 juin à 89 110 km", done: true, completedBy: "Marc Petit" },
  ],
  5: [
    { id: "5-1", title: "Vidange moteur", category: "Entretien", detail: "Prévue à 70 000 km · tous les 20 000 km", done: false, dueKm: 70000, recurrenceKm: 20000 },
    { id: "5-2", title: "Contrôle des niveaux", category: "Entretien", detail: "Réalisé le 11 août à 63 120 km", done: true, completedBy: "Thomas Bernard" },
    { id: "5-3", title: "Remplacement batterie", category: "Électricité", detail: "Réalisé le 16 janvier à 51 840 km", done: true, completedBy: "Marc Petit" },
  ],
  6: [
    { id: "6-1", title: "Finaliser le diagnostic moteur", category: "Urgent", detail: "Véhicule HS · diagnostic en cours", done: false },
    { id: "6-2", title: "Contrôle technique dépassé", category: "Réglementaire", detail: "Échéance dépassée depuis le 8 août 2026", done: false },
    { id: "6-3", title: "Remplacement courroie accessoires", category: "Mécanique", detail: "Réalisé le 20 mai à 128 400 km", done: true, completedBy: "Thomas Bernard" },
  ],
};

const weeklyChecksSeed: WeeklyCheck[] = [
  { name: "Lucas Martin", initials: "LM", vehicle: "GA-218-NK", done: true, detail: "Lundi à 07:16" },
  { name: "Sarah Dupont", initials: "SD", vehicle: "FH-704-LP", done: true, detail: "Mardi à 06:58" },
  { name: "Mehdi Laurent", initials: "ML", vehicle: "FT-866-CV", done: true, detail: "Mercredi à 07:24" },
  { name: "Nina Robert", initials: "NR", vehicle: "GN-143-BD", done: true, detail: "Jeudi à 08:03" },
  { name: "Julien Morel", initials: "JM", vehicle: "—", done: false, detail: "Pas encore réalisé" },
  { name: "Emma Garcia", initials: "EG", vehicle: "—", done: false, detail: "Pas encore réalisé" },
  { name: "Hugo Leroy", initials: "HL", vehicle: "—", done: false, detail: "Pas encore réalisé" },
  { name: "Chloé Michel", initials: "CM", vehicle: "—", done: false, detail: "Pas encore réalisé" },
];

function formatKm(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} km`;
}

function StatusPill({ status }: { status: Vehicle["status"] }) {
  return <span className={`status-pill ${status === "HS" ? "danger" : "ok"}`}><span />{status}</span>;
}

function VehicleMark({ vehicle, compact = false }: { vehicle: Vehicle; compact?: boolean }) {
  return (
    <div className={`vehicle-mark ${compact ? "compact" : ""}`} aria-hidden="true">
      <img src={vehicle.image} alt="" />
    </div>
  );
}

function Metric({ value, label, tone = "ink" }: { value: string; label: string; tone?: string }) {
  return <div className={`metric ${tone}`}><strong>{value}</strong><span>{label}</span></div>;
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<Role>("salarie");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedVehicleId, setSelectedVehicleId] = useState(1);
  const [search, setSearch] = useState("");
  const [mileage, setMileage] = useState("82460");
  const [checks, setChecks] = useState<Record<string, string>>({});
  const [checkNotes, setCheckNotes] = useState<Record<string, string>>({});
  const [padThickness, setPadThickness] = useState<Record<"front" | "rear", string>>({ front: "", rear: "" });
  const [licenceNumber, setLicenceNumber] = useState("");
  const [damageState, setDamageState] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  const [controlComment, setControlComment] = useState("");
  const [damagePhotos, setDamagePhotos] = useState<Record<string, PhotoPreview>>({});
  const [reportCategory, setReportCategory] = useState("");
  const [reportMileage, setReportMileage] = useState("82460");
  const [reportDescription, setReportDescription] = useState("");
  const [reportPhotos, setReportPhotos] = useState<PhotoPreview[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState(vehicles);
  const [issues, setIssues] = useState(issueSeed);
  const [operations, setOperations] = useState(operationsSeed);
  const [weeklyChecks, setWeeklyChecks] = useState(weeklyChecksSeed);
  const [issueFilter, setIssueFilter] = useState<"todo" | "done">("todo");
  const [hideWeeklyControls, setHideWeeklyControls] = useState(false);
  const [workEntry, setWorkEntry] = useState<WorkEntry | null>(null);
  const [workTitle, setWorkTitle] = useState("");
  const [workMileage, setWorkMileage] = useState("");
  const [workComment, setWorkComment] = useState("");
  const [toast, setToast] = useState("");

  const selectedVehicle = fleetVehicles.find((v) => v.id === selectedVehicleId) ?? fleetVehicles[0];
  const selectedOperations = operations[selectedVehicle.id] ?? [];
  const activeWorkOperation = workEntry?.kind === "operation"
    ? (operations[workEntry.vehicleId] ?? []).find((operation) => operation.id === workEntry.operationId)
    : undefined;
  const simpleCheckCount = checkItems.filter((item) => checks[item.id]).length;
  const licenceComplete = Boolean(checks.licence) && (checks.licence === "no" || Boolean(licenceNumber.trim()));
  const damageComplete = Boolean(damageState)
    && damagePhotoSlots.every((slot) => damagePhotos[slot.id])
    && (damageState !== "problem" || Boolean(damageNotes.trim()));
  const completedCheckCount = simpleCheckCount
    + (mileage.trim() ? 1 : 0)
    + (padThickness.front ? 1 : 0)
    + (padThickness.rear ? 1 : 0)
    + (licenceComplete ? 1 : 0)
    + (damageComplete ? 1 : 0);
  const checkIssueCount = checkItems.filter((item) => item.choices.find((choice) => choice.value === checks[item.id])?.issue).length
    + (checks.licence === "no" ? 1 : 0)
    + (damageState === "problem" ? 1 : 0);
  const issueNotesComplete = checkItems.every((item) => {
    const choice = item.choices.find((option) => option.value === checks[item.id]);
    return !choice?.needsNote || Boolean(checkNotes[item.id]?.trim());
  });
  const controlReady = completedCheckCount === totalCheckCount && issueNotesComplete;
  const reportReady = Boolean(reportCategory && reportMileage.trim() && reportDescription.trim());
  const workReady = Boolean(workEntry && workTitle.trim() && workMileage.trim());
  const pendingMaintenance = Object.entries(operations).flatMap(([vehicleId, vehicleOperations]) =>
    vehicleOperations.filter((operation) => !operation.done).map((operation) => ({ ...operation, vehicleId: Number(vehicleId) })),
  );
  const periodicPending = pendingMaintenance.filter((operation) => operation.recurrenceKm || operation.recurrenceMonths);
  const periodicCompleted = Object.entries(operations).flatMap(([vehicleId, vehicleOperations]) =>
    vehicleOperations.filter((operation) => operation.done && (operation.recurrenceKm || operation.recurrenceMonths)).map((operation) => ({ ...operation, vehicleId: Number(vehicleId) })),
  );
  const queueTodoCount = issues.filter((issue) => !issue.done).length + periodicPending.length;
  const completedWeeklyCount = weeklyChecks.filter((check) => check.done).length;
  const weeklyCompletionPercent = weeklyChecks.length ? Math.round((completedWeeklyCount / weeklyChecks.length) * 100) : 0;
  const queueHasItems = issueFilter === "todo"
    ? issues.some((issue) => !issue.done) || periodicPending.length > 0
    : issues.some((issue) => issue.done) || periodicCompleted.length > 0;
  const filteredVehicles = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return fleetVehicles;
    return fleetVehicles.filter((vehicle) => `${vehicle.plate} ${vehicle.label}`.toLowerCase().includes(query));
  }, [search, fleetVehicles]);

  const allowedRoles = useMemo(() => {
    if (!currentUser) return [role];
    if (currentUser.role === "chef") return ["chef", "mecano", "salarie"] as Role[];
    if (currentUser.role === "mecano") return ["mecano", "salarie"] as Role[];
    return ["salarie"] as Role[];
  }, [currentUser, role]);

  async function apiRequest<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => ({})) as T & { error?: string };
    if (response.status === 413) throw new Error("Les photos sont encore trop lourdes. Reprenez-les puis réessayez.");
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    return data;
  }

  async function loadState() {
    const data = await apiRequest<{ vehicles: Vehicle[]; issues: Issue[]; operations: Record<number, Operation[]>; weeklyChecks: WeeklyCheck[] }>("/api/state");
    setFleetVehicles(data.vehicles);
    setIssues(data.issues);
    setOperations(data.operations);
    setWeeklyChecks(data.weeklyChecks);
    const selected = data.vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? data.vehicles[0];
    if (selected) {
      setSelectedVehicleId(selected.id);
      setMileage(String(selected.km));
      setReportMileage(String(selected.km));
    }
  }

  useEffect(() => {
    let active = true;
    void apiRequest<{ user: AppUser | null }>("/api/session")
      .then(async ({ user }) => {
        if (!active || !user) return;
        setCurrentUser(user);
        setRole(user.role);
        await loadState();
        if (active) {
          setLoggedIn(true);
          setScreen(user.role === "mecano" ? "workshop" : user.role === "chef" ? "fleet" : "home");
        }
      })
      .catch(() => undefined)
      .finally(() => { if (active) setInitializing(false); });
    return () => { active = false; };
    // Session restoration only runs once when the application opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen, loggedIn, role]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function readPhotoFiles(files: FileList | null, limit: number) {
    const selected = Array.from(files ?? []).slice(0, limit);
    return Promise.all(selected.map(async (file) => {
      const preparedFile = await preparePhotoFile(file);
      return new Promise<PhotoPreview>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: preparedFile.name, url: String(reader.result), file: preparedFile });
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(preparedFile);
      });
    }));
  }

  async function handleReportPhotos(event: ChangeEvent<HTMLInputElement>) {
    const availableSlots = Math.max(0, 4 - reportPhotos.length);
    const newPhotos = await readPhotoFiles(event.target.files, availableSlots);
    setReportPhotos([...reportPhotos, ...newPhotos]);
    event.target.value = "";
  }

  async function handleDamagePhoto(slotId: string, event: ChangeEvent<HTMLInputElement>) {
    const newPhotos = await readPhotoFiles(event.target.files, 1);
    if (newPhotos.length) setDamagePhotos({ ...damagePhotos, [slotId]: newPhotos[0] });
    event.target.value = "";
  }

  function resetWeeklyControl() {
    setChecks({});
    setCheckNotes({});
    setPadThickness({ front: "", rear: "" });
    setLicenceNumber("");
    setDamageState("");
    setDamageNotes("");
    setControlComment("");
    setDamagePhotos({});
  }

  async function submitWeeklyControl() {
    if (!controlReady || saving) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("payload", JSON.stringify({
        vehicleId: selectedVehicle.id,
        mileage: Number(mileage),
        checks,
        notes: checkNotes,
        padThickness,
        licenceNumber,
        damageState,
        damageNotes,
        comment: controlComment,
      }));
      for (const slot of damagePhotoSlots) {
        const photo = damagePhotos[slot.id];
        if (photo?.file) form.append("photos", photo.file, `${slot.id}-${photo.name}`);
      }
      const result = await apiRequest<{ generatedTasks: number }>("/api/weekly-controls", { method: "POST", body: form });
      await loadState();
      showToast(result.generatedTasks
        ? `Contrôle enregistré · ${result.generatedTasks} tâche${result.generatedTasks > 1 ? "s" : ""} envoyée${result.generatedTasks > 1 ? "s" : ""} à l'atelier`
        : "Contrôle hebdomadaire enregistré");
      resetWeeklyControl();
      setScreen("home");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Contrôle impossible");
    } finally {
      setSaving(false);
    }
  }

  function resetProblemReport() {
    setReportCategory("");
    setReportMileage(String(selectedVehicle.km));
    setReportDescription("");
    setReportPhotos([]);
  }

  async function submitProblemReport() {
    if (!reportReady || saving) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("payload", JSON.stringify({ vehicleId: selectedVehicle.id, category: reportCategory, mileage: Number(reportMileage), description: reportDescription }));
      for (const photo of reportPhotos) if (photo.file) form.append("photos", photo.file, photo.name);
      const result = await apiRequest<{ photoCount: number }>("/api/issues", { method: "POST", body: form });
      await loadState();
      showToast(`Problème transmis${result.photoCount ? ` avec ${result.photoCount} photo${result.photoCount > 1 ? "s" : ""}` : ""}`);
      resetProblemReport();
      setScreen("home");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Signalement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setLoginError("");
    setSaving(true);
    try {
      const { user } = await apiRequest<{ user: AppUser }>("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, pin }) });
      setCurrentUser(user);
      setRole(user.role);
      await loadState();
      setLoggedIn(true);
      setScreen(user.role === "mecano" ? "workshop" : user.role === "chef" ? "fleet" : "home");
      setPin("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setSaving(false);
      setInitializing(false);
    }
  }

  function switchRole(nextRole: Role) {
    if (!allowedRoles.includes(nextRole)) return;
    setRole(nextRole);
    setScreen(nextRole === "mecano" ? "workshop" : nextRole === "chef" ? "fleet" : "home");
  }

  async function logout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
    setCurrentUser(null);
    setLoggedIn(false);
    setRole("salarie");
    setScreen("home");
  }

  async function submitMileage() {
    if (!mileage.trim() || saving) return;
    setSaving(true);
    try {
      await apiRequest("/api/mileage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId: selectedVehicle.id, mileage: Number(mileage) }) });
      await loadState();
      showToast("Kilométrage enregistré");
      setScreen("home");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  function selectVehicle(vehicle: Vehicle) {
    setSelectedVehicleId(vehicle.id);
    setMileage(String(vehicle.km));
    setReportMileage(String(vehicle.km));
    if (role === "salarie") {
      setScreen("home");
      showToast(`${vehicle.plate} est maintenant affiché par défaut`);
    } else {
      setScreen("vehicle");
    }
  }

  function formatDateLabel(date: Date) {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function openWorkForm(entry: WorkEntry, suggestedTitle = "") {
    const vehicle = fleetVehicles.find((item) => item.id === entry.vehicleId) ?? selectedVehicle;
    setWorkEntry(entry);
    setWorkTitle(suggestedTitle);
    setWorkMileage(String(vehicle.km));
    setWorkComment("");
  }

  function closeWorkForm() {
    setWorkEntry(null);
    setWorkTitle("");
    setWorkMileage("");
    setWorkComment("");
  }

  function changeWorkVehicle(vehicleId: number) {
    const vehicle = fleetVehicles.find((item) => item.id === vehicleId);
    if (!workEntry || !vehicle) return;
    setWorkEntry({ ...workEntry, vehicleId });
    setWorkMileage(String(vehicle.km));
  }

  async function submitWorkEntry() {
    if (!workEntry || !workReady || saving) return;
    setSaving(true);
    try {
      await apiRequest("/api/operations/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workEntry, title: workTitle, mileage: Number(workMileage), comment: workComment }),
      });
      await loadState();
      showToast("Opération enregistrée dans l'historique");
      closeWorkForm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Opération impossible");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVehicleStatus() {
    if (saving) return;
    const nextStatus: Vehicle["status"] = selectedVehicle.status === "HS" ? "Disponible" : "HS";
    setSaving(true);
    try {
      await apiRequest("/api/vehicles/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId: selectedVehicle.id, status: nextStatus }) });
      await loadState();
      showToast(`${selectedVehicle.plate} passé en ${nextStatus}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Modification impossible");
    } finally {
      setSaving(false);
    }
  }

  if (!loggedIn) {
    return (
      <main className="login-page">
        <section className="login-brand">
          <div className="brand-lockup light"><span className="brand-sign">F</span><span>Flotte</span></div>
          <div className="login-copy">
            <p className="eyebrow light-text">Gestion des utilitaires</p>
            <h1>Le parc,<br />simplement.</h1>
            <p>Contrôlez, signalez et suivez vos véhicules depuis le terrain.</p>
          </div>
          <div className="brand-stats"><span><strong>25</strong> utilitaires</span><span><strong>2</strong> statuts simples</span></div>
        </section>

        <section className="login-panel">
          <form className="login-card" onSubmit={login}>
            <div className="prototype-flag">MVP connecté</div>
            <p className="eyebrow">Bienvenue</p>
            <h2>Accéder à l'application</h2>
            <p className="muted">Choisissez votre profil de démonstration.</p>

            <div className="profile-picker" role="group" aria-label="Profil de démonstration">
              {(Object.keys(roleLabels) as Role[]).map((item) => (
                <button type="button" key={item} className={role === item ? "active" : ""} onClick={() => { setRole(item); setLoginError(""); }}>
                  <span className="avatar">{roleInitials[item]}</span>
                  <span><strong>{roleLabels[item]}</strong><small>{item === "salarie" ? "Terrain" : item === "mecano" ? "Atelier" : "Pilotage"}</small></span>
                </button>
              ))}
            </div>

            <label className="field-label" htmlFor="pin">Code PIN</label>
            <input id="pin" className="pin-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin} disabled={saving} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setLoginError(""); }} placeholder="••••" aria-describedby="pin-help" />
            <p id="pin-help" className="field-help">Codes de démonstration : salarié 1111 · mécanicien 2222 · chef 3333.</p>
            {loginError && <p className="validation-hint login-error">{loginError}</p>}
            <button className="primary-button login-button" type="submit" disabled={initializing || saving || pin.length < 4}>{initializing ? "Vérification…" : saving ? "Connexion…" : "Se connecter"} <span aria-hidden="true">→</span></button>
          </form>
        </section>
      </main>
    );
  }

  const navigation = role === "salarie"
    ? [{ key: "home", label: "Accueil", icon: "⌂" }, { key: "vehicles", label: "Véhicules", icon: "▣" }]
    : role === "mecano"
      ? [{ key: "workshop", label: "Atelier", icon: "⌁" }, { key: "vehicles", label: "Véhicules", icon: "▣" }, { key: "maintenance", label: "Entretiens", icon: "◷" }]
      : [{ key: "fleet", label: "Pilotage", icon: "▦" }, { key: "vehicles", label: "Parc", icon: "▣" }, { key: "workshop", label: "Atelier", icon: "⌁" }, { key: "maintenance", label: "Entretiens", icon: "◷" }];

  const titles: Record<Screen, string> = {
    home: `Bonjour ${currentUser?.name.split(" ")[0] ?? "Lucas"}`,
    vehicles: "Choisir un véhicule",
    vehicle: "Fiche véhicule",
    mileage: "Nouveau kilométrage",
    check: "Contrôle du véhicule",
    report: "Signaler un problème",
    workshop: "Atelier",
    maintenance: "Entretiens et alertes",
    fleet: "Vue du parc",
  };

  return (
    <main className="prototype-page">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-lockup"><span className="brand-sign">F</span><span>Flotte</span></div>
          <nav aria-label="Navigation principale">
            {navigation.map((item) => (
              <button key={item.key} className={screen === item.key ? "active" : ""} onClick={() => setScreen(item.key as Screen)}>
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <span className="avatar">{currentUser?.initials ?? roleInitials[role]}</span>
            <div><strong>{currentUser?.name ?? "Utilisateur"}</strong><small>{roleLabels[currentUser?.role ?? role]}</small></div>
            <button className="logout" aria-label="Se déconnecter" onClick={logout}>↗</button>
          </div>
        </aside>

        <section className="app-content">
          <header className="topbar">
            <div>
              <p className="eyebrow">Samedi 15 août</p>
              <h1>{titles[screen]}</h1>
            </div>
            <div className="topbar-actions">
              <label className="demo-select">Voir comme
                <select value={role} onChange={(e) => switchRole(e.target.value as Role)}>
                  {allowedRoles.map((allowedRole) => <option key={allowedRole} value={allowedRole}>{roleLabels[allowedRole]}</option>)}
                </select>
              </label>
              {role !== "salarie" && <button className="notification-button" aria-label="Notifications" onClick={() => setScreen("maintenance")}><span>!</span><i /></button>}
              <span className="top-avatar">{currentUser?.initials ?? roleInitials[role]}</span>
            </div>
          </header>

          <div className="mobile-topbar">
            <div className="brand-lockup"><span className="brand-sign">F</span><span>Flotte</span></div>
            <button className="role-chip" disabled={allowedRoles.length === 1} onClick={() => switchRole(allowedRoles[(allowedRoles.indexOf(role) + 1) % allowedRoles.length])}>{roleLabels[role]} · En ligne</button>
          </div>

          <div className="screen-area">
            {screen === "home" && (
              <div className="screen-stack">
                <section className="mobile-heading"><p className="eyebrow">Samedi 15 août</p><h1>Bonjour {currentUser?.name.split(" ")[0] ?? "Lucas"}</h1><p>Quel véhicule utilisez-vous aujourd'hui ?</p></section>

                <section className="current-vehicle-card">
                  <div className="vehicle-card-copy">
                    <div className="card-overline"><span>Véhicule affiché</span><StatusPill status={selectedVehicle.status} /></div>
                    <h2>{selectedVehicle.label}</h2>
                    <div className="plate">{selectedVehicle.plate}</div>
                    <div className="vehicle-facts"><span><small>Kilométrage</small><strong>{formatKm(selectedVehicle.km)}</strong></span><span><small>Prochain entretien</small><strong>{selectedVehicle.maintenance}</strong></span></div>
                  </div>
                  <VehicleMark vehicle={selectedVehicle} />
                  <button type="button" className="change-vehicle" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setScreen("vehicles"); }}>Changer de véhicule <span>→</span></button>
                </section>

                <section>
                  <div className="section-title"><div><p className="eyebrow">Actions rapides</p><h2>Que voulez-vous faire ?</h2></div></div>
                  <div className="quick-actions">
                    <button className="quick-card blue" onClick={() => setScreen("mileage")}><span className="action-icon">123</span><strong>Saisir le kilométrage</strong><small>Dernier relevé : aujourd'hui</small><i>→</i></button>
                    <button className="quick-card green" onClick={() => setScreen("check")}><span className="action-icon">✓</span><strong>Contrôle hebdomadaire</strong><small>17 points à vérifier</small><i>→</i></button>
                    <button className="quick-card orange" onClick={() => setScreen("report")}><span className="action-icon">!</span><strong>Signaler un problème</strong><small>Photo facultative</small><i>→</i></button>
                  </div>
                </section>

                <section className="info-strip"><span className="info-icon">i</span><div><strong>Pas d'affectation dans l'application</strong><p>Vous pouvez changer librement de véhicule. Cette sélection sert uniquement à afficher sa fiche.</p></div></section>
              </div>
            )}

            {screen === "vehicles" && (
              <div className="screen-stack">
                <section className="mobile-heading"><button className="back-button" onClick={() => setScreen(role === "salarie" ? "home" : role === "mecano" ? "workshop" : "fleet")}>←</button><p className="eyebrow">{fleetVehicles.length} utilitaires</p><h1>{role === "salarie" ? "Choisir un véhicule" : "Ouvrir une fiche véhicule"}</h1><p>{role === "salarie" ? "Plusieurs salariés peuvent utiliser le même véhicule." : "Consultez les opérations réalisées et celles qui restent à faire."}</p></section>
                <div className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Plaque, marque ou modèle" aria-label="Rechercher un véhicule" /></div>
                <div className="filters"><button className="active">Tous <span>{fleetVehicles.length}</span></button><button>Disponibles <span>{fleetVehicles.filter((vehicle) => vehicle.status === "Disponible").length}</span></button><button>HS <span>{fleetVehicles.filter((vehicle) => vehicle.status === "HS").length}</span></button></div>
                <div className="vehicle-grid">
                  {filteredVehicles.map((vehicle) => (
                    <button className={`vehicle-list-card ${vehicle.id === selectedVehicleId ? "selected" : ""}`} key={vehicle.id} onClick={() => selectVehicle(vehicle)}>
                      <VehicleMark vehicle={vehicle} compact />
                      <div className="vehicle-list-copy"><div><strong>{vehicle.label}</strong><span className="plate small">{vehicle.plate}</span></div><small>{formatKm(vehicle.km)}</small><StatusPill status={vehicle.status} /></div>
                      {vehicle.id === selectedVehicleId && <span className="selected-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {screen === "vehicle" && (
              <div className="screen-stack">
                <button className="back-link vehicle-back" onClick={() => setScreen("vehicles")}>← Retour aux véhicules</button>
                <section className="vehicle-detail-hero">
                  <div className="vehicle-detail-identity">
                    <VehicleMark vehicle={selectedVehicle} />
                    <div>
                      <div className="vehicle-detail-status"><span className="plate small">{selectedVehicle.plate}</span><StatusPill status={selectedVehicle.status} /></div>
                      <h2>{selectedVehicle.label}</h2>
                      <p>Dernier kilométrage : <strong>{formatKm(selectedVehicle.km)}</strong></p>
                    </div>
                  </div>
                  <div className="vehicle-detail-actions">
                    <div className="operation-counts">
                      <span><strong>{selectedOperations.filter((operation) => !operation.done).length}</strong> à faire</span>
                      <span><strong>{selectedOperations.filter((operation) => operation.done).length}</strong> réalisées</span>
                    </div>
                    <div className="vehicle-action-buttons">
                      <button className="hero-outline-button" onClick={() => openWorkForm({ kind: "new", vehicleId: selectedVehicle.id })}>＋ Opération réalisée</button>
                      <button className={`hero-status-button ${selectedVehicle.status === "HS" ? "available" : "danger"}`} disabled={saving} onClick={toggleVehicleStatus}>{saving ? "Enregistrement…" : selectedVehicle.status === "HS" ? "Remettre disponible" : "Passer en HS"}</button>
                    </div>
                  </div>
                </section>

                <div className="operations-layout">
                  <section className="panel operations-panel pending">
                    <div className="section-title"><div><p className="eyebrow">À traiter</p><h2>Opérations à faire</h2></div><span className="panel-count">{selectedOperations.filter((operation) => !operation.done).length}</span></div>
                    <div className="operation-list">
                      {selectedOperations.filter((operation) => !operation.done).map((operation) => (
                        <article className="operation-row" key={operation.id}>
                          <span className={`operation-symbol ${operation.category === "Urgent" ? "urgent" : ""}`}>!</span>
                          <div><span className="operation-category">{operation.category}</span><h3>{operation.title}</h3><p>{operation.detail}</p></div>
                          <button className="outline-button" onClick={() => openWorkForm({ kind: "operation", vehicleId: selectedVehicle.id, operationId: operation.id }, operation.title)}>Marquer fait</button>
                        </article>
                      ))}
                      {selectedOperations.every((operation) => operation.done) && <p className="empty-state">Aucune opération en attente sur ce véhicule.</p>}
                    </div>
                  </section>

                  <section className="panel operations-panel history">
                    <div className="section-title"><div><p className="eyebrow">Historique complet</p><h2>Chronologie du véhicule</h2></div><button className={`history-toggle ${hideWeeklyControls ? "active" : ""}`} onClick={() => setHideWeeklyControls(!hideWeeklyControls)}>{hideWeeklyControls ? "Afficher contrôles hebdo" : "Masquer contrôles hebdo"}</button></div>
                    <div className="vehicle-history">
                      {selectedOperations.filter((operation) => operation.done).map((operation) => (
                        <article className="history-entry operation-entry" key={operation.id}>
                          <span className="history-symbol operation">✓</span>
                          <div><span className="history-type">Opération · {operation.category}</span><h3>{operation.title}</h3><p>{operation.detail}</p>{operation.comment && <blockquote>“{operation.comment}”</blockquote>}<small>Par {operation.completedBy}</small></div>
                        </article>
                      ))}
                      {issues.filter((issue) => issue.vehicle === selectedVehicle.plate).map((issue) => (
                        <article className="history-entry report-entry" key={`issue-${issue.id}`}>
                          <span className="history-symbol report">!</span>
                          <div><span className="history-type">{issue.source === "weekly" ? "Contrôle hebdo" : "Signalement"} · {issue.done ? "Fait" : "À faire"}</span><h3>{issue.title}</h3><p>{issue.meta}</p>{issue.photos && issue.photos.length > 0 && <div className="history-photos">{issue.photos.map((photo, index) => <img key={`${photo.name}-${index}`} src={photo.url} alt={`Photo du signalement ${index + 1}`} />)}</div>}</div>
                        </article>
                      ))}
                      {!hideWeeklyControls && weeklyChecks.filter((check) => check.done && check.vehicle === selectedVehicle.plate).map((check) => (
                        <article className="history-entry check-entry" key={`check-${check.name}`}>
                          <span className="history-symbol check">✓</span>
                          <div><span className="history-type">Contrôle hebdomadaire</span><h3>Contrôle réalisé par {check.name}</h3><p>{check.detail} · aucune anomalie bloquante</p></div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {screen === "mileage" && (
              <div className="narrow-screen">
                <button className="back-link" onClick={() => setScreen("home")}>← Retour</button>
                <section className="form-card">
                  <div className="form-vehicle"><VehicleMark vehicle={selectedVehicle} compact /><div><span className="plate small">{selectedVehicle.plate}</span><strong>{selectedVehicle.label}</strong></div></div>
                  <p className="eyebrow">Relevé kilométrique</p><h2>Quel est le kilométrage affiché ?</h2>
                  <label className="field-label" htmlFor="mileage">Kilométrage actuel</label>
                  <div className="unit-input"><input id="mileage" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))} /><span>km</span></div>
                  <p className="field-help">Le relevé précédent est de {formatKm(selectedVehicle.km)}.</p>
                  <button className="primary-button" disabled={saving || !mileage.trim()} onClick={submitMileage}>{saving ? "Enregistrement…" : "Enregistrer le relevé"}</button>
                </section>
              </div>
            )}

            {screen === "check" && (
              <div className="narrow-screen wide-form">
                <button className="back-link" onClick={() => setScreen("home")}>← Retour</button>
                <section className="form-card">
                  <div className="form-head"><div><p className="eyebrow">Contrôle hebdomadaire · {selectedVehicle.plate}</p><h2>Vérification du véhicule</h2><p className="muted">Renseignez chaque mesure et chaque état. Les quatre photos extérieures sont obligatoires.</p></div><span className="progress-ring">{completedCheckCount}<small>/{totalCheckCount}</small></span></div>
                  <div className="control-instructions"><span>i</span><p><strong>Comment procéder ?</strong> Relevez le kilométrage, faites le tour du véhicule puis démarrez-le. Précisez toute anomalie avant de terminer.</p></div>

                  <div className="control-section-heading"><span>01</span><div><strong>Relevé</strong><small>Kilométrage affiché au tableau de bord</small></div></div>
                  <div className="control-km-field">
                    <label className="field-label" htmlFor="weekly-mileage">Kilométrage *</label>
                    <div className="unit-input"><input id="weekly-mileage" inputMode="numeric" value={mileage} onChange={(event) => setMileage(event.target.value.replace(/\D/g, ""))} /><span>km</span></div>
                  </div>

                  <div className="control-section-heading"><span>02</span><div><strong>Pneus et freinage</strong><small>État visuel et mesures des plaquettes</small></div></div>
                  <div className="check-list">
                    {checkItems.slice(0, 3).map((item, index) => {
                      const selectedChoice = item.choices.find((choice) => choice.value === checks[item.id]);
                      return <div className={`check-row detailed ${selectedChoice?.issue ? "has-issue" : ""}`} key={item.id}>
                        <span className="check-number">{index + 2}</span>
                        <div className="check-copy"><span>{item.category}</span><strong>{item.title}</strong><small>{item.hint}</small></div>
                        <div className="segmented">{item.choices.map((choice) => <button type="button" key={choice.value} className={checks[item.id] === choice.value ? `active ${choice.tone}` : ""} onClick={() => setChecks({ ...checks, [item.id]: choice.value })}>{choice.label}</button>)}</div>
                        {selectedChoice?.needsNote && <div className="check-issue-fields"><label><span>Précisez le problème *</span><textarea rows={2} value={checkNotes[item.id] ?? ""} onChange={(event) => setCheckNotes({ ...checkNotes, [item.id]: event.target.value })} placeholder="Décrivez ce qui ne va pas…" /></label></div>}
                      </div>;
                    })}
                    {(["front", "rear"] as const).map((axle, index) => (
                      <div className="check-row detailed brake-measure" key={axle}>
                        <span className="check-number">{index + 5}</span>
                        <div className="check-copy"><span>Freinage</span><strong>Plaquettes {axle === "front" ? "avant" : "arrière"}</strong><small>Mesurez l'épaisseur restante entre 0 et 12 mm</small></div>
                        <div className={`range-field ${padThickness[axle] ? "completed" : ""}`}>
                          <output>{padThickness[axle] || "—"}<small> mm</small></output>
                          <input aria-label={`Épaisseur des plaquettes ${axle === "front" ? "avant" : "arrière"}`} type="range" min="0" max="12" step="1" value={padThickness[axle] || "6"} onChange={(event) => setPadThickness({ ...padThickness, [axle]: event.target.value })} />
                          <div><span>0 mm</span><span>12 mm</span></div>
                          {!padThickness[axle] && <small>Déplacez le curseur pour renseigner la mesure.</small>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="control-section-heading"><span>03</span><div><strong>Équipements et niveaux</strong><small>Fonctionnement, voyants et liquides</small></div></div>
                  <div className="check-list">
                    {checkItems.slice(3, 11).map((item, index) => {
                      const selectedChoice = item.choices.find((choice) => choice.value === checks[item.id]);
                      return <div className={`check-row detailed ${selectedChoice?.issue ? "has-issue" : ""}`} key={item.id}>
                        <span className="check-number">{index + 7}</span>
                        <div className="check-copy"><span>{item.category}</span><strong>{item.title}</strong><small>{item.hint}</small></div>
                        <div className="segmented">{item.choices.map((choice) => <button type="button" key={choice.value} className={checks[item.id] === choice.value ? `active ${choice.tone}` : ""} onClick={() => setChecks({ ...checks, [item.id]: choice.value })}>{choice.label}</button>)}</div>
                        {selectedChoice?.needsNote && <div className="check-issue-fields"><label><span>Précisez le problème *</span><textarea rows={2} value={checkNotes[item.id] ?? ""} onChange={(event) => setCheckNotes({ ...checkNotes, [item.id]: event.target.value })} placeholder="Décrivez ce qui ne va pas…" /></label></div>}
                      </div>;
                    })}
                  </div>

                  <div className="control-section-heading"><span>04</span><div><strong>Conformité et dégâts</strong><small>Documents du véhicule et quatre vues extérieures</small></div></div>
                  <div className="check-list compliance-list">
                    {checkItems.slice(11).map((item) => {
                      const selectedChoice = item.choices.find((choice) => choice.value === checks[item.id]);
                      return <div className={`check-row detailed ${selectedChoice?.issue ? "has-issue" : ""}`} key={item.id}>
                        <span className="check-number">15</span>
                        <div className="check-copy"><span>{item.category}</span><strong>{item.title}</strong><small>{item.hint}</small></div>
                        <div className="segmented">{item.choices.map((choice) => <button type="button" key={choice.value} className={checks[item.id] === choice.value ? `active ${choice.tone}` : ""} onClick={() => setChecks({ ...checks, [item.id]: choice.value })}>{choice.label}</button>)}</div>
                      </div>;
                    })}
                    <div className={`check-row detailed ${checks.licence === "no" ? "has-issue" : ""}`}>
                      <span className="check-number">16</span>
                      <div className="check-copy"><span>Conformité</span><strong>Licence présente</strong><small>Vérifiez la présence du document dans le véhicule</small></div>
                      <div className="segmented"><button type="button" className={checks.licence === "yes" ? "active ok" : ""} onClick={() => setChecks({ ...checks, licence: "yes" })}>Oui</button><button type="button" className={checks.licence === "no" ? "active issue" : ""} onClick={() => { setChecks({ ...checks, licence: "no" }); setLicenceNumber(""); }}>Non</button></div>
                      {checks.licence === "yes" && <label className="licence-field"><span>Numéro de licence *</span><input value={licenceNumber} onChange={(event) => setLicenceNumber(event.target.value.toUpperCase())} placeholder="Ex. LIC-2026-0048" /></label>}
                    </div>
                    <div className={`damage-control ${damageState === "problem" ? "has-issue" : ""}`}>
                      <div className="damage-control-head"><span className="check-number">17</span><div className="check-copy"><span>Carrosserie</span><strong>Dégâts</strong><small>Photographiez obligatoirement les quatre faces du véhicule</small></div><div className="segmented"><button type="button" className={damageState === "ok" ? "active ok" : ""} onClick={() => setDamageState("ok")}>Aucun nouveau dégât</button><button type="button" className={damageState === "problem" ? "active issue" : ""} onClick={() => setDamageState("problem")}>Dégât constaté</button></div></div>
                      {damageState === "problem" && <label className="damage-note"><span>Décrivez le ou les dégâts *</span><textarea rows={3} value={damageNotes} onChange={(event) => setDamageNotes(event.target.value)} placeholder="Emplacement, taille, circonstance si connue…" /></label>}
                      <div className="damage-photo-grid">{damagePhotoSlots.map((slot) => {
                        const photo = damagePhotos[slot.id];
                        return <div className={`damage-photo-slot ${photo ? "filled" : ""}`} key={slot.id}>
                          <input className="visually-hidden" id={`damage-photo-${slot.id}`} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => handleDamagePhoto(slot.id, event)} />
                          {photo ? <><img src={photo.url} alt={slot.label} /><span>{slot.label}<small>Photo ajoutée</small></span><label htmlFor={`damage-photo-${slot.id}`}>Remplacer</label></> : <label htmlFor={`damage-photo-${slot.id}`}><span>＋</span><strong>{slot.label}</strong><small>Photo obligatoire</small></label>}
                        </div>;
                      })}</div>
                      <p className="photo-requirement"><strong>{Object.keys(damagePhotos).length}/4 photos</strong>{Object.keys(damagePhotos).length === 4 ? " · dossier complet" : " · encore requises pour valider"}</p>
                    </div>
                  </div>

                  <label className="control-comment">
                    <span>Commentaire général <small>Facultatif</small></span>
                    <textarea rows={4} value={controlComment} onChange={(event) => setControlComment(event.target.value)} placeholder="Ajoutez une remarque utile sur le véhicule ou sur ce contrôle…" />
                  </label>

                  <div className="control-summary"><span className={completedCheckCount === totalCheckCount ? "complete" : ""}>{completedCheckCount}/{totalCheckCount} renseignés</span><span className={checkIssueCount ? "issue" : ""}>{checkIssueCount} anomalie{checkIssueCount > 1 ? "s" : ""}</span></div>
                  {!controlReady && completedCheckCount >= totalCheckCount - 1 && <p className="validation-hint">Complétez les champs obligatoires, les descriptions d'anomalies et les quatre photos avant de terminer.</p>}
                  <button className="primary-button" disabled={!controlReady || saving} onClick={submitWeeklyControl}>{saving ? "Enregistrement…" : "Terminer le contrôle"}</button>
                </section>
              </div>
            )}

            {screen === "report" && (
              <div className="narrow-screen wide-form">
                <button className="back-link" onClick={() => setScreen("home")}>← Retour</button>
                <section className="form-card report-card">
                  <div className="report-heading"><div><p className="eyebrow">Signalement terrain</p><h2>Signaler un problème</h2><p className="muted">Décrivez simplement ce que vous constatez. Le mécanicien et le chef recevront le signalement.</p></div><span className="report-symbol">!</span></div>
                  <div className="report-vehicle"><VehicleMark vehicle={selectedVehicle} compact /><div><span className="plate small">{selectedVehicle.plate}</span><strong>{selectedVehicle.label}</strong><small>{formatKm(selectedVehicle.km)} au dernier relevé</small></div><StatusPill status={selectedVehicle.status} /></div>

                  <div className="report-section-label"><span>01</span><strong>Le problème</strong></div>
                  <div className="form-grid report-fields">
                    <label><span className="field-label">Catégorie *</span><select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}><option value="" disabled>Choisir dans la liste</option>{issueCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                    <label><span className="field-label">Kilométrage actuel *</span><div className="unit-input compact"><input value={reportMileage} onChange={(event) => setReportMileage(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /><span>km</span></div></label>
                  </div>
                  <label className="report-description"><span className="field-label">Description *</span><textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} placeholder="Ex. Un bruit métallique se fait entendre au freinage, surtout à faible vitesse…" rows={5} /><small>{reportDescription.trim().length ? `${reportDescription.trim().length} caractères` : "Indiquez où, quand et comment le problème se manifeste."}</small></label>

                  <div className="report-section-label"><span>02</span><strong>Photos</strong><small>Facultatives</small></div>
                  <label className={`photo-drop ${reportPhotos.length ? "has-files" : ""} ${reportPhotos.length === 4 ? "full" : ""}`} htmlFor={reportPhotos.length < 4 ? "issue-photos" : undefined}><span>{reportPhotos.length === 4 ? "✓" : "＋"}</span><strong>{reportPhotos.length === 4 ? "4 photos ajoutées" : reportPhotos.length ? "Ajouter une autre photo" : "Ajouter des photos"}</strong><small>Jusqu'à 4 photos · JPG, PNG ou WebP</small></label>
                  <input className="visually-hidden" id="issue-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleReportPhotos} />
                  {reportPhotos.length > 0 && <><div className="photo-preview-grid">{reportPhotos.map((photo, index) => <figure key={`${photo.name}-${index}`}><img src={photo.url} alt={`Photo jointe ${index + 1}`} /><figcaption>Photo {index + 1}</figcaption><button type="button" aria-label={`Supprimer ${photo.name}`} onClick={() => setReportPhotos(reportPhotos.filter((_, photoIndex) => photoIndex !== index))}>×</button></figure>)}</div><p className="report-photo-count">{reportPhotos.length}/4 photo{reportPhotos.length > 1 ? "s" : ""} ajoutée{reportPhotos.length > 1 ? "s" : ""}</p></>}
                  <div className="report-notice"><span>i</span><p><strong>Le véhicule reste inchangé.</strong> Le signalement n'indique pas une prise de véhicule et ne le passe pas automatiquement en HS.</p></div>
                  {!reportReady && (reportCategory || reportDescription || reportPhotos.length > 0) && <p className="validation-hint">La catégorie, le kilométrage et la description sont nécessaires pour envoyer le signalement.</p>}
                  <div className="form-actions"><button type="button" className="secondary-button" disabled={saving} onClick={() => { resetProblemReport(); setScreen("home"); }}>Annuler</button><button type="button" className="primary-button" disabled={!reportReady || saving} onClick={submitProblemReport}>{saving ? "Envoi…" : "Envoyer au mécanicien"}</button></div>
                </section>
              </div>
            )}

            {screen === "workshop" && (
              <div className="screen-stack">
                <section className="workshop-lead"><div><p className="eyebrow">Vue mécanicien</p><h2>Atelier</h2><p>Problèmes, échéances et disponibilités au même endroit.</p></div><button className="primary-button compact-primary" onClick={() => openWorkForm({ kind: "new", vehicleId: selectedVehicle.id })}>＋ Enregistrer une opération</button></section>
                <div className="metric-grid"><Metric value={String(queueTodoCount)} label="Tâches à faire" tone="orange" /><Metric value={String(fleetVehicles.filter((vehicle) => vehicle.status === "HS").length)} label="Véhicules HS" tone="red" /><Metric value={String(pendingMaintenance.length)} label="Opérations prévues" tone="blue" /><Metric value={String(Object.values(operations).flat().filter((operation) => operation.done).length)} label="Opérations faites" tone="green" /></div>
                <section className="panel workshop-issues">
                  <div className="section-title"><div><p className="eyebrow">File de travail</p><h2>Travaux à traiter</h2><p className="section-note">Signalements, pneus/freins du contrôle hebdo et opérations périodiques.</p></div><div className="filters compact-filters"><button className={issueFilter === "todo" ? "active" : ""} onClick={() => setIssueFilter("todo")}>À faire</button><button className={issueFilter === "done" ? "active" : ""} onClick={() => setIssueFilter("done")}>Fait</button></div></div>
                  <div className="issue-list">
                    {issues.filter((issue) => issueFilter === "done" ? issue.done : !issue.done).map((issue) => (
                      <article className={`issue-card ${issue.done ? "done" : ""}`} key={issue.id}>
                        <span className={`issue-indicator ${issue.urgent ? "urgent" : ""}`}>{issue.done ? "✓" : issue.urgent ? "!" : "·"}</span>
                        <div className="issue-main"><div className="issue-meta"><button className="plate small plate-button" onClick={() => { const vehicle = fleetVehicles.find((item) => item.plate === issue.vehicle); if (vehicle) selectVehicle(vehicle); }}>{issue.vehicle}</button>{issue.source === "weekly" && <span className="source-label">Contrôle hebdo</span>}{issue.urgent && <span className="urgent-label">Urgent</span>}</div><h3>{issue.title}</h3><p>{issue.meta}</p>{issue.photos && issue.photos.length > 0 && <div className="issue-photo-strip">{issue.photos.map((photo, index) => <img key={`${photo.name}-${index}`} src={photo.url} alt={`Photo ${index + 1} du signalement`} />)}<span>{issue.photos.length} photo{issue.photos.length > 1 ? "s" : ""}</span></div>}</div>
                        <span className={`task-state ${issue.done ? "done" : ""}`}>{issue.done ? "Fait" : "À faire"}</span>
                        {!issue.done && <button className="outline-button" onClick={() => { const vehicle = fleetVehicles.find((item) => item.plate === issue.vehicle) ?? selectedVehicle; openWorkForm({ kind: "issue", vehicleId: vehicle.id, issueId: issue.id }, issue.title); }}>Clôturer</button>}
                      </article>
                    ))}
                    {(issueFilter === "todo" ? periodicPending : periodicCompleted).map((operation) => { const vehicle = fleetVehicles.find((item) => item.id === operation.vehicleId) ?? selectedVehicle; return (
                      <article className={`issue-card periodic-task ${operation.done ? "done" : ""}`} key={`periodic-${operation.id}`}>
                        <span className="issue-indicator periodic">↻</span>
                        <div className="issue-main"><div className="issue-meta"><button className="plate small plate-button" onClick={() => selectVehicle(vehicle)}>{vehicle.plate}</button><span className="source-label periodic">Périodique</span></div><h3>{operation.title}</h3><p>{operation.detail}</p></div>
                        <span className={`task-state ${operation.done ? "done" : ""}`}>{operation.done ? "Fait" : "À faire"}</span>
                        {!operation.done && <button className="outline-button" onClick={() => openWorkForm({ kind: "operation", vehicleId: vehicle.id, operationId: operation.id }, operation.title)}>Réaliser</button>}
                      </article>
                    ); })}
                    {!queueHasItems && <p className="empty-state">Aucune tâche dans cette liste.</p>}
                  </div>
                </section>
                <div className="dashboard-columns workshop-overview">
                  <section className="panel"><div className="section-title"><div><p className="eyebrow">Disponibilité</p><h2>Véhicules HS</h2></div><button className="text-button" onClick={() => setScreen("vehicles")}>Voir le parc →</button></div><div className="hs-list">{fleetVehicles.filter((vehicle) => vehicle.status === "HS").map((vehicle) => <article key={vehicle.id}><VehicleMark vehicle={vehicle} compact /><div><span className="plate small">{vehicle.plate}</span><strong>{vehicle.label}</strong><small>{vehicle.maintenance}</small></div><button className="text-button" onClick={() => selectVehicle(vehicle)}>Ouvrir →</button></article>)}{fleetVehicles.every((vehicle) => vehicle.status !== "HS") && <p className="empty-state">Aucun véhicule hors service.</p>}</div></section>
                  <section className="panel"><div className="section-title"><div><p className="eyebrow">À anticiper</p><h2>Prochaines opérations</h2></div><button className="text-button" onClick={() => setScreen("maintenance")}>Tout voir →</button></div><div className="workshop-maintenance-list">{pendingMaintenance.slice(0, 3).map((operation) => { const vehicle = fleetVehicles.find((item) => item.id === operation.vehicleId)!; return <button key={operation.id} onClick={() => selectVehicle(vehicle)}><span className="maintenance-icon">◷</span><span><strong>{operation.title}</strong><small>{vehicle.plate} · {operation.detail}</small></span><i>→</i></button>; })}</div></section>
                </div>
              </div>
            )}

            {screen === "maintenance" && (
              <div className="screen-stack">
                <section className="mobile-heading"><p className="eyebrow">Prévention</p><h1>Entretiens et alertes</h1><p>Échéances calculées par date ou kilométrage.</p></section>
                <div className="metric-grid three"><Metric value={String(pendingMaintenance.length)} label="Opérations à faire" tone="orange" /><Metric value={String(pendingMaintenance.filter((operation) => operation.recurrenceKm || operation.recurrenceMonths).length)} label="Échéances récurrentes" tone="blue" /><Metric value={String(fleetVehicles.filter((vehicle) => vehicle.status === "Disponible").length)} label="Véhicules disponibles" tone="green" /></div>
                <section className="panel timeline-panel">
                  <div className="section-title"><div><p className="eyebrow">À surveiller</p><h2>Prochaines échéances</h2></div><small className="automatic-label">↻ Renouvellement automatique</small></div>
                  <div className="timeline">
                    {pendingMaintenance.slice(0, 8).map((operation) => { const vehicle = fleetVehicles.find((item) => item.id === operation.vehicleId)!; const remainingKm = operation.dueKm ? operation.dueKm - vehicle.km : undefined; return <article key={operation.id}><span className={`timeline-dot ${operation.category === "Urgent" ? "red" : operation.recurrenceKm || operation.recurrenceMonths ? "blue" : "orange"}`} /><div><button className="plate small plate-button" onClick={() => selectVehicle(vehicle)}>{vehicle.plate}</button><h3>{operation.title}</h3><p>{operation.detail}</p></div><span className={operation.category === "Urgent" ? "late-chip" : "soon-chip"}>{remainingKm !== undefined ? `${new Intl.NumberFormat("fr-FR").format(remainingKm)} km` : operation.recurrenceMonths ? `${operation.recurrenceMonths} mois` : "À prévoir"}</span></article>; })}
                  </div>
                </section>
              </div>
            )}

            {screen === "fleet" && (
              <div className="screen-stack">
                <section className="mobile-heading"><p className="eyebrow">Vue chef</p><h1>Vue du parc</h1><p>L'essentiel de la flotte en un coup d'œil.</p></section>
                <div className="fleet-summary">
                  <div className="fleet-lead"><p className="eyebrow light-text">État du parc</p><strong>{fleetVehicles.filter((vehicle) => vehicle.status === "Disponible").length}<small>/{fleetVehicles.length}</small></strong><span>véhicules disponibles</span><div className="availability-bar"><i style={{ width: `${fleetVehicles.length ? (fleetVehicles.filter((vehicle) => vehicle.status === "Disponible").length / fleetVehicles.length) * 100 : 0}%` }} /></div></div>
                  <div className="metric-grid chief-metrics"><Metric value={String(fleetVehicles.filter((vehicle) => vehicle.status === "HS").length)} label="Véhicules HS" tone="red" /><Metric value={String(issues.filter((issue) => !issue.done).length)} label="Problèmes à faire" tone="orange" /><Metric value={String(pendingMaintenance.length)} label="Entretiens à prévoir" tone="blue" /><Metric value="4/8" label="Contrôles hebdo faits" tone="green" /></div>
                </div>
                <section className="panel weekly-panel">
                  <div className="weekly-panel-head">
                    <div><p className="eyebrow">Semaine du 10 au 16 août</p><h2>Contrôles hebdomadaires</h2><p>Suivi nominatif des salariés ayant réalisé leur contrôle.</p></div>
                    <div className="weekly-progress"><strong>{weeklyCompletionPercent}%</strong><span><i style={{ width: `${weeklyCompletionPercent}%` }} /></span><small>{completedWeeklyCount} contrôle{completedWeeklyCount > 1 ? "s" : ""} sur {weeklyChecks.length}</small></div>
                  </div>
                  <div className="weekly-grid">
                    {weeklyChecks.map((person) => (
                      <article className={`weekly-person ${person.done ? "checked" : "missing"}`} key={person.name}>
                        <span className="person-avatar">{person.initials}</span>
                        <div><strong>{person.name}</strong><p>{person.detail}</p></div>
                        <span className="weekly-vehicle">{person.vehicle}</span>
                        <span className="weekly-state">{person.done ? "✓ Fait" : "À faire"}</span>
                      </article>
                    ))}
                  </div>
                </section>
                <div className="dashboard-columns">
                  <section className="panel"><div className="section-title"><div><p className="eyebrow">Attention requise</p><h2>Véhicules HS</h2></div><button className="text-button" onClick={() => setScreen("vehicles")}>Voir le parc →</button></div><div className="hs-list">{fleetVehicles.filter((vehicle) => vehicle.status === "HS").map((vehicle) => <article key={vehicle.id}><VehicleMark vehicle={vehicle} compact /><div><span className="plate small">{vehicle.plate}</span><strong>{vehicle.label}</strong><small>{vehicle.maintenance}</small></div><StatusPill status="HS" /></article>)}</div></section>
                  <section className="panel"><div className="section-title"><div><p className="eyebrow">Aujourd'hui</p><h2>Activité récente</h2></div></div><div className="activity-list"><article><span className="activity-icon orange">!</span><div><strong>Problème signalé</strong><p>Lucas · GJ-391-RT</p></div><time>07:42</time></article><article><span className="activity-icon blue">123</span><div><strong>Kilométrage relevé</strong><p>Sarah · FH-704-LP</p></div><time>07:18</time></article><article><span className="activity-icon green">✓</span><div><strong>Contrôle terminé</strong><p>Mehdi · FT-866-CV</p></div><time>06:54</time></article></div></section>
                </div>
              </div>
            )}
          </div>

          <nav className="bottom-nav" aria-label="Navigation mobile">
            {navigation.slice(0, 4).map((item) => (
              <button key={item.key} className={screen === item.key ? "active" : ""} onClick={() => setScreen(item.key as Screen)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>
            ))}
          </nav>
        </section>
      </div>
      {workEntry && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeWorkForm(); }}>
          <section className="work-modal" role="dialog" aria-modal="true" aria-labelledby="work-modal-title">
            <div className="work-modal-head"><div><p className="eyebrow">Saisie mécanicien</p><h2 id="work-modal-title">{workEntry.kind === "new" ? "Enregistrer une opération" : "Clôturer avec une opération"}</h2></div><button aria-label="Fermer" onClick={closeWorkForm}>×</button></div>
            <p className="muted">L'opération, le kilométrage et la date seront ajoutés à la chronologie du véhicule.</p>

            <div className="work-form-grid">
              <label><span className="field-label">Véhicule *</span><select value={workEntry.vehicleId} disabled={workEntry.kind !== "new"} onChange={(event) => changeWorkVehicle(Number(event.target.value))}>{fleetVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.label}</option>)}</select></label>
              <label><span className="field-label">Date</span><div className="automatic-date"><span>✓</span><strong>{formatDateLabel(new Date())}</strong><small>Automatique</small></div></label>
            </div>
            <label className="work-field"><span className="field-label">Opération réalisée *</span><input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="Ex. Vidange moteur et remplacement du filtre" /></label>
            <label className="work-field"><span className="field-label">Kilométrage lors de l'opération *</span><div className="unit-input"><input value={workMileage} onChange={(event) => setWorkMileage(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /><span>km</span></div></label>
            {activeWorkOperation?.recurrenceKm && workMileage && <div className="renewal-preview"><span>↻</span><p><strong>Prochaine échéance automatique</strong>À {formatKm(Number(workMileage) + activeWorkOperation.recurrenceKm)}, soit {new Intl.NumberFormat("fr-FR").format(activeWorkOperation.recurrenceKm)} km après cette intervention.</p></div>}
            {activeWorkOperation?.recurrenceMonths && <div className="renewal-preview"><span>↻</span><p><strong>Prochaine échéance automatique</strong>{activeWorkOperation.recurrenceMonths} mois après la date de cette intervention.</p></div>}
            <label className="work-field"><span className="field-label">Commentaire <small>Facultatif</small></span><textarea rows={3} value={workComment} onChange={(event) => setWorkComment(event.target.value)} placeholder="Remarque, pièce remplacée, observation…" /></label>
            <div className="form-actions"><button className="secondary-button" disabled={saving} onClick={closeWorkForm}>Annuler</button><button className="primary-button" disabled={!workReady || saving} onClick={submitWorkEntry}>{saving ? "Enregistrement…" : "Enregistrer comme fait"}</button></div>
          </section>
        </div>
      )}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}
