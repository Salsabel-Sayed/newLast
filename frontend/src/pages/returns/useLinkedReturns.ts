import { apiClient } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import { useApiResource } from "../../hooks/useApiResource";
import type { ReturnRecord } from "./return.types";

const EMPTY_RESULT: PaginatedResult<ReturnRecord> = { items: [], total: 0, page: 1, limit: 100, totalPages: 0 };

interface UseLinkedReturnsOptions {
  partyKind: "customer" | "supplier";
  partyId?: string | undefined;
  orderId?: string | undefined;
}

// Returns aren't queryable by salesOrderId/purchaseOrderId directly, so we fetch the
// party's returns (a supported filter) and narrow to this specific order client-side —
// consistent with this codebase's compute-on-read approach (no denormalized counters).
export function useLinkedReturns({ partyKind, partyId, orderId }: UseLinkedReturnsOptions) {
  const partyField = partyKind === "customer" ? "customerId" : "supplierId";

  const resource = useApiResource(
    () =>
      partyId
        ? apiClient.get<PaginatedResult<ReturnRecord>>("/returns", { [partyField]: partyId, limit: 100 })
        : Promise.resolve(EMPTY_RESULT),
    [partyField, partyId]
  );

  const items = orderId
    ? (resource.data?.items ?? []).filter((r) => r.salesOrderId === orderId || r.purchaseOrderId === orderId)
    : [];

  const totalReturnsValue = items.reduce((sum, r) => sum + r.totalAmount, 0);

  return {
    items,
    totalReturnsValue,
    loading: resource.loading,
    error: resource.error,
    reload: resource.reload,
  };
}
