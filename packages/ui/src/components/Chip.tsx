import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** Tap-to-toggle chip used by all person/paid-by pickers. */
export function Chip({ label, selected, onPress }: ChipProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        selected
          ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500"
          : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
      }`}
    >
      <Text className={`text-sm font-medium ${selected ? "text-white" : "text-neutral-800 dark:text-neutral-200"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
