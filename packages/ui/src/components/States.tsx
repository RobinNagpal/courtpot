import type { ReactElement } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "./Button";

export function LoadingState(): ReactElement {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <ActivityIndicator />
    </View>
  );
}

export function EmptyState({ message }: { message: string }): ReactElement {
  return (
    <View className="items-center justify-center p-8">
      <Text className="text-center text-base text-neutral-500 dark:text-neutral-400">{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): ReactElement {
  return (
    <View className="items-center justify-center gap-4 p-8">
      <Text className="text-center text-base text-red-600 dark:text-red-400">{message}</Text>
      {onRetry === undefined ? null : <Button label="Retry" variant="ghost" onPress={onRetry} />}
    </View>
  );
}
