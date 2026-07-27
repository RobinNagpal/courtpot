import type { ReactElement } from "react";
import { Text } from "react-native";

export function SectionTitle({ label }: { label: string }): ReactElement {
  return (
    <Text className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {label}
    </Text>
  );
}
