import { z } from "zod";
import { Role, RoleSchema } from "./roles";

export const Team = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Team name is required"),
});

/** A member's role within one team. A member may belong to several teams. */
export const TeamMembership = z.object({
  teamId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: RoleSchema.default(Role.TeamMemberViewer),
});

export type TeamT = z.infer<typeof Team>;
export type TeamMembershipT = z.infer<typeof TeamMembership>;
