import { apiClient } from "../api/client";
import type { PaginatedResult } from "../api/types";
import { useApiResource } from "./useApiResource";

const LOOKUP_LIMIT = 100;

export function useLookupList<T>(apiBasePath: string, includeInactive = false) {
  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<T>>(apiBasePath, {
        limit: LOOKUP_LIMIT,
        isActive: includeInactive ? undefined : "true",
      }),
    [apiBasePath, includeInactive]
  );

  return { items: data?.items ?? [], loading, error, reload };
}
