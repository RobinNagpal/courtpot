import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { Chip } from "@courtpot/ui";

export interface ChipOption {
  id: string;
  label: string;
}

interface ChipGroupProps {
  label: string;
  options: ChipOption[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
}

/** Labelled wrap of chips; selection semantics are up to the caller. */
export function ChipGroup({ label, options, selectedIds, onToggle }: ChipGroupProps): ReactElement {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.length === 0 ? (
          <Text className="text-sm text-neutral-400 dark:text-neutral-500">
            Nobody here yet — add people in the People tab.
          </Text>
        ) : (
          options.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              selected={selectedIds.includes(option.id)}
              onPress={() => onToggle(option.id)}
            />
          ))
        )}
      </View>
    </View>
  );
}
