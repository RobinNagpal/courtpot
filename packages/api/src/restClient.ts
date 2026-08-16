import { z } from "zod";
import {
  Guest,
  GuestBooking,
  LoginResult,
  Match,
  Member,
  MemberBooking,
  MemberTeam,
  Team,
  TeamPage,
  Transfer,
} from "@courtpot/schemas";
import type {
  LoginInputT,
  LoginResultT,
  MemberT,
  MemberTeamT,
  TeamCreateT,
  TeamEditT,
  TeamPageT,
  TeamT,
} from "@courtpot/schemas";
import type { CollectionClient, Entity, LedgerClient } from "./client";

export interface RestClientConfig {
  /** API origin, e.g. https://api.example.com (no trailing slash). */
  baseUrl: string;
  getToken: () => string | null;
  /** Called on any 401 so the app can drop the stored session. */
  onUnauthorized?: () => void;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const ErrorBody = z.object({ error: z.string() });

async function request<TOut, TIn>(
  config: RestClientConfig,
  path: string,
  method: string,
  schema: z.ZodType<TOut, z.ZodTypeDef, TIn> | null,
  body?: object,
): Promise<TOut | null> {
  const token = config.getToken();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      config.onUnauthorized?.();
    }
    const parsed = ErrorBody.safeParse(await response.json().catch(() => null));
    throw new ApiError(response.status, parsed.success ? parsed.data.error : `Request failed (${response.status})`);
  }
  if (schema === null) {
    return null;
  }
  return schema.parse(await response.json());
}

function restCollection<T extends Entity, TIn>(
  config: RestClientConfig,
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, TIn>,
): CollectionClient<T> {
  const listSchema = z.array(schema);
  const require = (row: T | null): T => {
    if (row === null) {
      throw new ApiError(500, "Empty response");
    }
    return row;
  };
  return {
    list: async () => (await request(config, path, "GET", listSchema)) ?? [],
    create: async (row) => require(await request(config, path, "POST", schema, row)),
    createMany: async (rows) => (await request(config, `${path}/batch`, "POST", listSchema, rows)) ?? [],
    update: async (row) => require(await request(config, `${path}/${row.id}`, "PUT", schema, row)),
    remove: async (id) => {
      await request(config, `${path}/${id}`, "DELETE", null);
    },
  };
}

/** LedgerClient backed by the CourtPot REST API (apps/server). */
export function createRestLedgerClient(config: RestClientConfig): LedgerClient {
  return {
    members: restCollection(config, "/api/members", Member),
    guests: restCollection(config, "/api/guests", Guest),
    memberBookings: restCollection(config, "/api/memberBookings", MemberBooking),
    guestBookings: restCollection(config, "/api/guestBookings", GuestBooking),
    transfers: restCollection(config, "/api/transfers", Transfer),
    matches: restCollection(config, "/api/matches", Match),
  };
}

export interface AuthApi {
  login(input: LoginInputT): Promise<LoginResultT>;
  logout(): Promise<void>;
  me(): Promise<MemberT>;
}

export function createAuthApi(config: RestClientConfig): AuthApi {
  return {
    login: async (input) => {
      const result = await request(config, "/api/auth/login", "POST", LoginResult, input);
      if (result === null) {
        throw new ApiError(500, "Empty response");
      }
      return result;
    },
    logout: async () => {
      await request(config, "/api/auth/session/logout", "POST", null);
    },
    me: async () => {
      const member = await request(config, "/api/auth/session/me", "GET", Member);
      if (member === null) {
        throw new ApiError(500, "Empty response");
      }
      return member;
    },
  };
}

export interface TeamsApi {
  /** The signed-in member's teams, with their role in each. */
  mine(): Promise<MemberTeamT[]>;
  /** Mark a team as the one to land on at login. */
  setDefault(teamId: string): Promise<MemberT>;
  edit(teamId: string, input: TeamEditT): Promise<TeamT>;
  create(input: TeamCreateT): Promise<TeamT>;
  /** The read-only team page via the session, so no PIN is needed. */
  page(handle: string): Promise<TeamPageT>;
}

export function createTeamsApi(config: RestClientConfig): TeamsApi {
  const require = <T,>(row: T | null): T => {
    if (row === null) {
      throw new ApiError(500, "Empty response");
    }
    return row;
  };
  return {
    mine: async () => (await request(config, "/api/auth/session/teams", "GET", MemberTeam.array())) ?? [],
    setDefault: async (teamId) =>
      require(await request(config, "/api/auth/session/default-team", "PUT", Member, { teamId })),
    edit: async (teamId, input) => require(await request(config, `/api/teams/${teamId}`, "PUT", Team, input)),
    create: async (input) => require(await request(config, "/api/teams", "POST", Team, input)),
    page: async (handle) => require(await request(config, `/api/teams/${handle}/page`, "GET", TeamPage)),
  };
}

export interface PublicTeamApi {
  /** Open a team page with its PIN. No member login involved. */
  unlock(teamId: string, pin: string): Promise<TeamPageT>;
}

/**
 * Unauthenticated client for the public team page. Deliberately separate from
 * createRestLedgerClient: it sends no bearer token and reaches only the one
 * endpoint that sits outside requireAuth.
 */
export function createPublicTeamApi(baseUrl: string): PublicTeamApi {
  const config: RestClientConfig = { baseUrl, getToken: () => null };
  return {
    unlock: async (teamId, pin) => {
      const page = await request(config, `/api/teams/${teamId}/unlock`, "POST", TeamPage, { pin });
      if (page === null) {
        throw new ApiError(500, "Empty response");
      }
      return page;
    },
  };
}
