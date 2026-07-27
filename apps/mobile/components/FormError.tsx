import type { ReactElement } from "react";
import { Text } from "react-native";

export function FormError({ message }: { message: string | null }): ReactElement | null {
  if (message === null) {
    return null;
  }
  return <Text className="text-sm font-medium text-red-600 dark:text-red-400">{message}</Text>;
}
