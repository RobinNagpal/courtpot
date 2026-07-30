import type { ReactElement, ReactNode } from "react";
import { Text, View } from "react-native";

/** One labelled fact on a view page. */
export function Detail({ label, value }: { label: string; value: ReactNode }): ReactElement {
  return (
    <View className="flex-row items-start justify-between gap-3 border-b border-neutral-100 py-2.5 dark:border-neutral-800">
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">{label}</Text>
      {typeof value === "string" ? (
        <Text className="flex-1 text-right text-sm font-medium text-neutral-900 dark:text-neutral-100">{value}</Text>
      ) : (
        <View className="flex-1 items-end">{value}</View>
      )}
    </View>
  );
}
