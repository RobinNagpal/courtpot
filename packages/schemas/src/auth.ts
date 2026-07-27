import { z } from "zod";
import { Member } from "./costSplitting";

export const Username = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Username needs at least 2 characters")
  .regex(/^[a-z0-9_.-]+$/, "Letters, numbers, dots, dashes and underscores only");

/** 4-digit PIN. Stored server-side only — never returned by any API. */
export const Pin = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

/** Member payload for server mode, where a username is mandatory. */
export const MemberCreate = Member.extend({ username: Username });

export const LoginInput = z.object({
  username: Username,
  pin: Pin,
});

export const LoginResult = z.object({
  token: z.string().min(1),
  member: Member,
});

export type UsernameT = z.infer<typeof Username>;
export type PinT = z.infer<typeof Pin>;
export type MemberCreateT = z.infer<typeof MemberCreate>;
export type LoginInputT = z.infer<typeof LoginInput>;
export type LoginResultT = z.infer<typeof LoginResult>;
