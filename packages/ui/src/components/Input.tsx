import type { ReactElement } from "react";
import { Text, TextInput, View } from "react-native";
import type { KeyboardTypeOptions } from "react-native";

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}

export function Input({ label, value, onChangeText, placeholder, keyboardType }: InputProps): ReactElement {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor="#9ca3af"
        className="rounded-card border border-neutral-300 bg-white px-3 py-2.5 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
    </View>
  );
}
