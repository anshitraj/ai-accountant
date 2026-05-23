import type { NextFunction, Request, Response } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, rolePermissionsTable, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export interface AuthContext {
  userId: number;
  companyId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function attachAuthContext(req: Request, _res: Response, next: NextFunction) {
  const userId = Number(headerValue(req.headers["x-finverify-user-id"]));
  const companyId = Number(headerValue(req.headers["x-finverify-company-id"]));

  if (Number.isFinite(userId) && Number.isFinite(companyId)) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user && user.companyId === companyId && user.status === "active") {
      req.auth = {
        userId: user.id,
        companyId,
        email: user.email,
        role: user.role,
      };
    }
  }

  next();
}

export function getCompanyId(req: Request): number {
  return req.auth?.companyId ?? 1;
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const [allowed] = await db.select().from(rolePermissionsTable).where(and(
      eq(rolePermissionsTable.companyId, req.auth.companyId),
      eq(rolePermissionsTable.role, req.auth.role),
      eq(rolePermissionsTable.permission, permission),
      eq(rolePermissionsTable.enabled, true),
    )).limit(1);

    if (!allowed) {
      await db.insert(auditLogsTable).values({
        companyId: req.auth.companyId,
        userId: req.auth.userId,
        actorEmail: req.auth.email,
        action: "auth.permission_denied",
        entityType: "permission",
        metadata: { permission, role: req.auth.role, path: req.path, method: req.method },
        ipAddress: req.ip,
      });
      res.status(403).json({ error: "Permission denied", permission });
      return;
    }

    next();
  };
}

export async function auditAction(req: Request, action: string, entityType: string, entityId?: number | null, metadata?: Record<string, unknown>) {
  await db.insert(auditLogsTable).values({
    companyId: getCompanyId(req),
    userId: req.auth?.userId ?? null,
    actorEmail: req.auth?.email ?? "demo@finverify.local",
    action,
    entityType,
    entityId: entityId ?? null,
    metadata: metadata ?? {},
    ipAddress: req.ip,
  });
}
