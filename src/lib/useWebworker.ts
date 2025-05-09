// src/lib/useWebworker.ts
import { useState, useEffect, useRef, useCallback } from "react";

export type WorkerStatus =
  | "idle"
  | "running"
  | "success"
  | "error"
  | "terminated";

export interface UseWebworkerOptions {
  timeout?: number;
}

/**
 * Custom React hook to interact with Web Workers.
 *
 * @param {string | URL} workerUrl - The URL of the worker script.
 * @param {UseWebworkerOptions} [options] - Optional configuration for the worker.
 * @returns {{
 *   data: any | null,
 *   error: any | null,
 *   status: WorkerStatus,
 *   postMessage: (message: any) => void,
 *   terminateWorker: () => void
 * }} An object containing the worker's data, error state, status, a function to post messages, and a function to terminate the worker.
 */
export function useWebworker<T = any, R = any>(
  workerSource: string | URL | (() => Worker),
  options?: UseWebworkerOptions
) {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [status, setStatus] = useState<WorkerStatus>("idle"); // Initial status is idle
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setStatus("terminated");
      setData(null);
      setError(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    }
  }, []);

  useEffect(() => {
    if (!workerSource) return;

    try {
      let workerInstance: Worker;
      if (typeof workerSource === "function") {
        workerInstance = workerSource();
      } else {
        // Removed { type: "module" } as example.worker.js is likely a classic script
        workerInstance = new Worker(workerSource);
      }
      workerRef.current = workerInstance;
      // Set status to running only after successful worker creation
      setStatus("running");

      workerInstance.onmessage = (event: MessageEvent<R>) => {
        setData(event.data);
        setStatus("success");
        setError(null);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = undefined;
        }
      };

      workerInstance.onerror = (err: ErrorEvent) => {
        setError(err);
        setStatus("error");
        setData(null);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = undefined;
        }
      };

      if (options?.timeout) {
        timeoutRef.current = window.setTimeout(() => {
          if (status !== "success" && status !== "error") {
            terminateWorker();
            setError(new Error("Worker timed out"));
            setStatus("error");
          }
        }, options.timeout);
      }
    } catch (err) {
      setError(err);
      setStatus("error");
    }

    return () => {
      terminateWorker();
    };
  }, [workerSource, options?.timeout, terminateWorker]); // Removed status from dependencies

  const postMessage = useCallback(
    (message: T) => {
      if (workerRef.current && status !== "terminated") {
        workerRef.current.postMessage(message);
        // Optionally reset status or handle loading state here if needed for multiple messages
        // setStatus('running');
      } else {
        console.warn("Worker is not running or has been terminated.");
        setError(new Error("Worker is not running or has been terminated."));
        setStatus("error");
      }
    },
    [status]
  );

  return { data, error, status, postMessage, terminateWorker };
}
