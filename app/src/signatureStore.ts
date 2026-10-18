import { useEffect, useState } from "react";
import type { InspectionSignatures, SealingSignatures } from "./types";

const INSPECTION_KEY = "shentai.inspection.signatures.v1";
const SEALING_KEY = "shentai.sealing.signatures.v1";
const EVENT_NAME = "shentai:signatures-changed";

type SignatureMap<T> = Record<string, T>;
const memoryMaps: Record<string, SignatureMap<unknown>> = {};

function readMap<T>(key: string): SignatureMap<T> {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SignatureMap<T>) : {};
  } catch {
    return (memoryMaps[key] as SignatureMap<T> | undefined) ?? {};
  }
}

function writeMap<T>(key: string, map: SignatureMap<T>) {
  memoryMaps[key] = map as SignatureMap<unknown>;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // The in-memory fallback still keeps the current session usable.
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

function useSignatureMap<T>(key: string, id: string): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readMap<T>(key)[id] ?? ({} as T));

  useEffect(() => {
    const sync = () => setValue(readMap<T>(key)[id] ?? ({} as T));
    sync();
    window.addEventListener(EVENT_NAME, sync);
    return () => window.removeEventListener(EVENT_NAME, sync);
  }, [key, id]);

  const save = (next: T) => {
    const map = readMap<T>(key);
    map[id] = next;
    writeMap(key, map);
    setValue(next);
  };

  return [value, save];
}

export function useInspectionSignatures(id: string) {
  return useSignatureMap<InspectionSignatures>(INSPECTION_KEY, id);
}

export function useSealingSignatures(id: string) {
  return useSignatureMap<SealingSignatures>(SEALING_KEY, id);
}

export function getInspectionSignatures(id: string): InspectionSignatures {
  return readMap<InspectionSignatures>(INSPECTION_KEY)[id] ?? {};
}

export function getSealingSignatures(id: string): SealingSignatures {
  return readMap<SealingSignatures>(SEALING_KEY)[id] ?? {};
}

