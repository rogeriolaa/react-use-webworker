// src/lib/index.ts
export { useWebworker } from "./useWebworker";
import type {
  WorkerStatus as ImportedWorkerStatus,
  UseWebworkerOptions as ImportedUseWebworkerOptions,
} from "./useWebworker";

export type WorkerStatus = ImportedWorkerStatus;
export type UseWebworkerOptions = ImportedUseWebworkerOptions;
