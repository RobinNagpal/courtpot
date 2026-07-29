import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { Pin } from "@courtpot/schemas";

const STORAGE_KEY = "courtpot.teamPin";

const Stored = z.object({ handle: z.string().min(1), pin: Pin });

/**
 * The last team PIN typed on a public team page, so a returning visitor is not
 * asked again.
 *
 * Only one is kept: opening a different team replaces it, and signing in clears
 * it, since a member reaches the page through their session instead.
 */
export async function readTeamPin(handle: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  // Anything unreadable counts as "no saved PIN" — never throw at a caller that
  // is only asking whether it can skip a prompt.
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = Stored.safeParse(parsedJson);
  if (!parsed.success || parsed.data.handle !== handle) {
    return null;
  }
  return parsed.data.pin;
}

export async function saveTeamPin(handle: string, pin: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ handle, pin }));
}

export async function clearTeamPin(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
