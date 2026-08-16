import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { NavIconName } from "./NavChips";

export interface MenuEntry {
  href: string;
  label: string;
  hint: string;
  icon: NavIconName;
}

/** The tappable cards that make up the home menu and each of its sub-menus. */
export function MenuList({ entries }: { entries: readonly MenuEntry[] }): ReactElement {
  const router = useRouter();
  return (
    <View className="gap-2">
      {entries.map((entry) => (
        <Pressable
          key={entry.href}
          onPress={() => router.push(entry.href)}
          accessibilityRole="button"
          accessibilityLabel={entry.label}
          className="flex-row items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <Ionicons name={entry.icon} size={22} color="#64748b" />
          <View className="flex-1">
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{entry.label}</Text>
            <Text className="text-sm text-neutral-600 dark:text-neutral-400">{entry.hint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </Pressable>
      ))}
    </View>
  );
}
