import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/**
 * Top-left on every section screen. Icon plus label rather than an icon alone,
 * since this is the primary way back to the team's home page.
 */
export function HomeButton(): ReactElement {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.navigate("/")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Team home"
      className="mr-2 flex-row items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
    >
      <Ionicons name="home" size={18} color="#0f172a" />
      <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Home</Text>
    </Pressable>
  );
}
