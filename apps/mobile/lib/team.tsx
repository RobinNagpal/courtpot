import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SOLO_TEAM_ID } from "@courtpot/schemas";
import type { MemberTeamT } from "@courtpot/schemas";
import { isRemote } from "./config";
import { teamsApi } from "./storage";
import { useAuth } from "./auth";

const STORAGE_KEY = "courtpot.activeTeam";

/** Local mode has no teams, so it behaves as a single implicit one. */
const SOLO_TEAM: MemberTeamT[] = [];

interface TeamContextValue {
  /** False until the caller's teams have been loaded. */
  ready: boolean;
  teams: MemberTeamT[];
  activeTeamId: string;
  activeTeam: MemberTeamT | null;
  /** True when the member must still pick between several teams. */
  needsChoice: boolean;
  setActiveTeam: (teamId: string) => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: ReactNode }): ReactElement {
  const { signedIn } = useAuth();
  const [ready, setReady] = useState(!isRemote);
  const [teams, setTeams] = useState<MemberTeamT[]>(SOLO_TEAM);
  const [chosenId, setChosenId] = useState<string | null>(null);

  useEffect(() => {
    if (!isRemote || teamsApi === null || !signedIn) {
      return;
    }
    setReady(false);
    void (async () => {
      const [mine, stored] = await Promise.all([
        teamsApi.mine().catch((): MemberTeamT[] => []),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);
      setTeams(mine);
      // Keep the previous choice only if it is still one of the member's teams.
      setChosenId(mine.length === 1 ? (mine[0]?.id ?? null) : mine.some((t) => t.id === stored) ? stored : null);
      setReady(true);
    })();
  }, [signedIn]);

  const setActiveTeam = useCallback((teamId: string): void => {
    setChosenId(teamId);
    void AsyncStorage.setItem(STORAGE_KEY, teamId);
  }, []);

  const value = useMemo((): TeamContextValue => {
    if (!isRemote) {
      return {
        ready: true,
        teams: SOLO_TEAM,
        activeTeamId: SOLO_TEAM_ID,
        activeTeam: null,
        needsChoice: false,
        setActiveTeam,
      };
    }
    const active = teams.find((t) => t.id === chosenId) ?? null;
    return {
      ready,
      teams,
      activeTeamId: active?.id ?? "",
      activeTeam: active,
      needsChoice: ready && active === null,
      setActiveTeam,
    };
  }, [ready, teams, chosenId, setActiveTeam]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext);
  if (value === null) {
    throw new Error("useTeam must be used inside a TeamProvider");
  }
  return value;
}

/** The team every new row is stamped with. */
export function useActiveTeamId(): string {
  return useTeam().activeTeamId;
}
