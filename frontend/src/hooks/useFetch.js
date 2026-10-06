import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../utils/apiError';

/**
 * Runs `fetcher` whenever `deps` change and exposes { data, loading, error, reload, setData }.
 * Responses of outdated requests are ignored, so fast filter changes cannot show stale data.
 */
export function useFetch(fetcher, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const requestId = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFetcher = useCallback(fetcher, deps);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await stableFetcher();
      if (currentRequest === requestId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (currentRequest === requestId.current) {
        setState((previous) => ({ ...previous, loading: false, error: getErrorMessage(error) }));
      }
    }
  }, [stableFetcher]);

  useEffect(() => {
    load();
  }, [load]);

  const setData = useCallback((updater) => {
    setState((previous) => ({
      ...previous,
      data: typeof updater === 'function' ? updater(previous.data) : updater,
    }));
  }, []);

  return { ...state, reload: load, setData };
}
