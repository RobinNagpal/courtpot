import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { headerActionClass, headerActionTextClass, primaryColor } from "@courtpot/ui";

/**
 * Header action on the team home page only, and only when there is something to
 * switch to — or when an admin needs to reach team management.
 */
export function SwitchTeamButton(): ReactElement {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/teams")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Switch team"
      className={`mr-3 ${headerActionClass}`}
    >
      <Ionicons name="swap-horizontal" size={17} color={primaryColor} />
      <Text className={headerActionTextClass}>Switch</Text>
    </Pressable>
  );
}
