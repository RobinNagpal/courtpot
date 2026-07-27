import * as Crypto from "expo-crypto";

/** Stable client-generated UUID v4, so optimistic rows reconcile cleanly. */
export function newId(): string {
  return Crypto.randomUUID();
}
