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

interface SignatureLike {
  signedAt?: string;
}

function signedAt(value: unknown) {
  if (!value || typeof value !== "object") return 0;
  const text = (value as SignatureLike).signedAt;
  if (!text) return 0;
  const time = new Date(text.replace(" ", "T")).getTime();
  return Number.isFinite(time) ? time : 0;
}

function mergeSignatures<T>(seed: T | undefined, stored: T | undefined): T {
  if (!seed) return (stored ?? {}) as T;
  if (!stored) return seed;
  const merged: Record<string, unknown> = {
    ...(seed as unknown as Record<string, unknown>),
  };
  Object.entries(stored as unknown as Record<string, unknown>).forEach(
    ([key, value]) => {
    const current = merged[key];
    if (!current || signedAt(value) > signedAt(current)) merged[key] = value;
    },
  );
  return merged as T;
}

function useSignatureMap<T>(
  key: string,
  id: string,
  seed?: T,
): [T, (value: T) => void] {
  const read = () => mergeSignatures(seed, readMap<T>(key)[id]);
  const [value, setValue] = useState<T>(() => read());

  useEffect(() => {
    const sync = () => setValue(read());
    sync();
    window.addEventListener(EVENT_NAME, sync);
    return () => window.removeEventListener(EVENT_NAME, sync);
  }, [key, id, seed]);

  const save = (next: T) => {
    const map = readMap<T>(key);
    map[id] = next;
    writeMap(key, map);
    setValue(next);
  };

  return [value, save];
}

export function useInspectionSignatures(
  id: string,
  seed?: InspectionSignatures,
) {
  return useSignatureMap<InspectionSignatures>(INSPECTION_KEY, id, seed);
}

export function useSealingSignatures(id: string, seed?: SealingSignatures) {
  return useSignatureMap<SealingSignatures>(SEALING_KEY, id, seed);
}

export function getInspectionSignatures(id: string): InspectionSignatures {
  return readMap<InspectionSignatures>(INSPECTION_KEY)[id] ?? {};
}

export function getSealingSignatures(id: string): SealingSignatures {
  return readMap<SealingSignatures>(SEALING_KEY)[id] ?? {};
}

