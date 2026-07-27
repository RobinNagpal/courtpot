import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";

export type ButtonVariant = "primary" | "danger" | "ghost";

const containerClass: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 dark:bg-blue-500",
  danger: "bg-red-600 dark:bg-red-500",
  ghost: "bg-neutral-100 dark:bg-neutral-800",
};

const labelClass: Record<ButtonVariant, string> = {
  primary: "text-white",
  danger: "text-white",
  ghost: "text-neutral-900 dark:text-neutral-100",
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled = false }: ButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`items-center rounded-card px-4 py-3 active:opacity-80 ${containerClass[variant]} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`text-base font-semibold ${labelClass[variant]}`}>{label}</Text>
    </Pressable>
  );
}
