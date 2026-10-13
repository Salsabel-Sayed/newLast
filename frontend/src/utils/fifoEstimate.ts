export interface FifoUnit {
  quantity: number;
  unitCost: number;
}

export interface FifoEstimateResult {
  costPerUnit: number;
  totalCost: number;
  coveredQty: number;
  fullyCovered: boolean;
}

const QUANTITY_EPSILON = 1e-9;

export function estimateFifoCost(units: FifoUnit[], neededQty: number): FifoEstimateResult {
  let remaining = neededQty;
  let totalCost = 0;
  let covered = 0;

  for (const unit of units) {
    if (remaining <= QUANTITY_EPSILON) break;
    const available = Math.max(0, unit.quantity);
    if (available <= QUANTITY_EPSILON) continue;
    const take = Math.min(available, remaining);
    totalCost += take * unit.unitCost;
    covered += take;
    remaining -= take;
  }

  return {
    costPerUnit: covered > 0 ? totalCost / covered : 0,
    totalCost,
    coveredQty: covered,
    fullyCovered: remaining <= QUANTITY_EPSILON,
  };
}
