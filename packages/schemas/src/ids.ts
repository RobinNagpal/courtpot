import { z } from "zod";

/**
 * Every id in the system, normalised to lower case on the way in.
 *
 * `z.string().uuid()` accepts either case, but every id comparison in this
 * codebase is plain string equality — `Set` dedupe, `includes`, a Postgres `=`.
 * Without normalising, one person could be written two ways: the same player
 * could fill both sides of a match, and the delete guard would fail to see a
 * reference that is really there.
 */
export const Uuid = z.string().uuid().toLowerCase();

export type UuidT = z.infer<typeof Uuid>;
