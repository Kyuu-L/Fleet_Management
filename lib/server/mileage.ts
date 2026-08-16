export type MileagePayloadResult =
  | { ok: true; vehicleId: number; mileage: number }
  | { ok: false; error: string };

export function parseMileagePayload(rawVehicleId: unknown, rawMileage: unknown): MileagePayloadResult {
  const vehicleId = Number(rawVehicleId);
  const mileage = Number(rawMileage);
  if (!Number.isInteger(vehicleId) || !Number.isInteger(mileage) || mileage < 0) {
    return { ok: false, error: "Kilométrage invalide." };
  }
  return { ok: true, vehicleId, mileage };
}

export type MileageRegressionResult = { ok: true } | { ok: false; error: string };

export function checkMileageNotRegressing(mileage: number, currentKm: number): MileageRegressionResult {
  if (mileage < currentKm) {
    return { ok: false, error: `Le dernier relevé est déjà de ${currentKm} km.` };
  }
  return { ok: true };
}