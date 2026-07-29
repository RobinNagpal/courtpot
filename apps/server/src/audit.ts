import { randomUUID } from "node:crypto";
import { AuditLogEntry } from "@courtpot/schemas";
import type { AuditAction, AuditEntity, AuditLogEntryT, JsonValueT } from "@courtpot/schemas";
import type { Db } from "./db";

/** Never let a PIN reach the audit log, whatever the caller passed in. */
const SECRET_KEYS = new Set(["pin"]);

function redact(row: object): Record<string, JsonValueT> {
  const details: Record<string, JsonValueT> = {};
  for (const [key, value] of Object.entries(row)) {
    if (SECRET_KEYS.has(key)) {
      continue;
    }
    // Round-trip through JSON so Dates and Prisma Decimals become plain values.
    details[key] = JSON.parse(JSON.stringify(value ?? null)) as JsonValueT;
  }
  return details;
}

export interface AuditInput {
  actorId: string;
  actorName: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  row: object;
}

/**
 * Append one audit entry. Deliberately swallows its own errors: an audit write
 * must never turn a successful mutation into a failed request.
 */
export async function recordAudit(db: Db, input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        id: randomUUID(),
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: redact(input.row),
      },
    });
  } catch (error) {
    console.error("Failed to write audit entry", error);
  }
}

export async function listAuditLog(db: Db, limit: number): Promise<AuditLogEntryT[]> {
  const rows = await db.auditLog.findMany({ orderBy: { at: "desc" }, take: limit });
  return AuditLogEntry.array().parse(rows);
}
