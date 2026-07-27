import type { ReactElement, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}

export function ListItem({ title, subtitle, right, onPress }: ListItemProps): ReactElement {
  return (
    <Pressable
      accessibilityRole={onPress === undefined ? undefined : "button"}
      onPress={onPress}
      disabled={onPress === undefined}
      className="flex-row items-center justify-between gap-3 border-b border-neutral-100 py-3 active:opacity-70 dark:border-neutral-800"
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-medium text-neutral-900 dark:text-neutral-100">{title}</Text>
        {subtitle === undefined ? null : (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}
