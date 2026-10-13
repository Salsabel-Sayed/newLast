import { useCallback, useEffect, useState, type DependencyList } from "react";
import { ApiError } from "../api/client";

interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList
): ApiResourceState<T> & { reload: () => void } {
  const [state, setState] = useState<ApiResourceState<T>>({ data: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE,
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, reload };
}
