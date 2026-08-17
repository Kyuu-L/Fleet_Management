export type VehicleModel = {
  id: string;
  label: string;
  image: string;
};

export const vehicleModels: VehicleModel[] = [
  { id: "master-3-l2h2", label: "Renault Master III L2H2 2022", image: "/vehicles/master-3-l2h2.webp" },
  { id: "sprinter-w906", label: "Mercedes Sprinter W906", image: "/vehicles/sprinter-w906.webp" },
  { id: "interstar-2025", label: "Nissan Interstar 2025", image: "/vehicles/interstar-2025.webp" },
  { id: "trafic-2018", label: "Renault Trafic 2018", image: "/vehicles/trafic-2018.webp" },
  { id: "ducato-2025", label: "Fiat Ducato 2025", image: "/vehicles/ducato-2025.webp" },
  { id: "ford-transit-connect", label: "Ford Transit Connect", image: "/vehicles/ford-transit-connect-placeholder.svg" },
];

const modelById = new Map(vehicleModels.map((model) => [model.id, model]));

export function getVehicleModel(modelId: string | null | undefined) {
  if (!modelId) return null;
  return modelById.get(modelId) ?? null;
}

export function inferVehicleModelId(label: string, image: string) {
  const fromImage = vehicleModels.find((model) => model.image === image);
  if (fromImage) return fromImage.id;
  const normalized = label.trim().toLowerCase();
  return vehicleModels.find((model) => model.label.toLowerCase() === normalized)?.id ?? null;
}
