import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { headerActionClass, headerActionTextClass, primaryColor } from "@courtpot/ui";

/**
 * Top-left on every section screen. Primary blue with a label, since this is the
 * main way back to the team's home page.
 */
export function HomeButton(): ReactElement {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.navigate("/")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Team home"
      className={`ml-3 ${headerActionClass}`}
    >
      <Ionicons name="home" size={18} color={primaryColor} />
      <Text className={headerActionTextClass}>Home</Text>
    </Pressable>
  );
}
