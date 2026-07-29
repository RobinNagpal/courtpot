import type { ReactElement } from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/** Header button on every section screen, back to the team's home page. */
export function HomeButton(): ReactElement {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.navigate("/")} hitSlop={12} accessibilityLabel="Team home">
      <Ionicons name="home-outline" size={22} color="#0f172a" />
    </Pressable>
  );
}
