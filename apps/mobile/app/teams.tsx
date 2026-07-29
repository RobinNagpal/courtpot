import type { ReactElement } from "react";
import { useRouter } from "expo-router";
import { TeamPickerScreen } from "../components/TeamPickerScreen";

/** Reachable from the team home when a member belongs to more than one team. */
export default function TeamsScreen(): ReactElement {
  const router = useRouter();
  // Picking a team here returns to that team's home page.
  return <TeamPickerScreen onPicked={() => router.replace("/")} />;
}
