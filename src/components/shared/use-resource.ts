"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
export function useResource<T>(path: string | null) {
  const [revision, setRevision] = useState(0);
  const key = path + ":" + revision;
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>();
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => setResult({ key, data }))
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setResult({ key, error: error.message });
      });
    return () => controller.abort();
  }, [path, key]);
  return {
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
    loading: !!path && result?.key !== key,
    reload,
  };
}
