import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type NavIconName = keyof typeof Ionicons.glyphMap;

export interface NavChip {
  key: string;
  label: string;
  icon: NavIconName;
  active: boolean;
  onPress: () => void;
}

/**
 * The chip bar shared by the signed-in nav and the public team page. Wraps onto
 * as many lines as it needs: scrolling sideways hid the later chips with no
 * visible affordance.
 */
export function NavChips({ chips }: { chips: readonly NavChip[] }): ReactElement {
  return (
    <View className="flex-row flex-wrap gap-2">
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          onPress={chip.onPress}
          disabled={chip.active}
          accessibilityRole="button"
          accessibilityLabel={chip.label}
          accessibilityState={{ selected: chip.active }}
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${
            chip.active ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-100 dark:bg-neutral-800"
          }`}
        >
          <Ionicons name={chip.icon} size={15} color={chip.active ? "#f8fafc" : "#475569"} />
          <Text
            className={`text-sm font-semibold ${
              chip.active ? "text-neutral-50 dark:text-neutral-900" : "text-neutral-700 dark:text-neutral-200"
            }`}
          >
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
