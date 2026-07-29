import { describe, expect, it } from "vitest";
import { Role } from "@courtpot/schemas";
import { Action, can, canSetPin } from "../src";

describe("role permissions", () => {
  it("lets an Admin do everything", () => {
    for (const action of Object.values(Action)) {
      expect(can(Role.Admin, action)).toBe(true);
    }
  });

  it("lets a TeamMemberAdmin add team members but not manage the platform", () => {
    expect(can(Role.TeamMemberAdmin, Action.AddTeamMembers)).toBe(true);
    expect(can(Role.TeamMemberAdmin, Action.WriteLedger)).toBe(true);
    expect(can(Role.TeamMemberAdmin, Action.ManageTeams)).toBe(false);
    expect(can(Role.TeamMemberAdmin, Action.ManageMembers)).toBe(false);
  });

  it("lets a TeamMember write the ledger but not add members", () => {
    expect(can(Role.TeamMember, Action.WriteLedger)).toBe(true);
    expect(can(Role.TeamMember, Action.AddTeamMembers)).toBe(false);
  });

  it("gives a TeamMemberViewer read access only", () => {
    expect(can(Role.TeamMemberViewer, Action.ReadLedger)).toBe(true);
    expect(can(Role.TeamMemberViewer, Action.WriteLedger)).toBe(false);
  });

  describe("PIN control", () => {
    it("lets an Admin set and update any PIN", () => {
      expect(canSetPin(Role.Admin, true)).toBe(true);
      expect(canSetPin(Role.Admin, false)).toBe(true);
    });

    it("lets a TeamMemberAdmin set an initial PIN but never change an existing one", () => {
      expect(canSetPin(Role.TeamMemberAdmin, true)).toBe(true);
      expect(canSetPin(Role.TeamMemberAdmin, false)).toBe(false);
    });

    it("denies everyone else", () => {
      expect(canSetPin(Role.TeamMember, true)).toBe(false);
      expect(canSetPin(Role.TeamMemberViewer, true)).toBe(false);
    });
  });
});
