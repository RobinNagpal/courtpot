import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { headerActionClass, headerActionTextClass, primaryColor } from "@courtpot/ui";

/** Pencil in the header: from a view page to its edit page. */
export function EditButton({ href }: { href: string }): ReactElement {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Edit"
      className={headerActionClass}
    >
      <Ionicons name="pencil" size={17} color={primaryColor} />
      <Text className={headerActionTextClass}>Edit</Text>
    </Pressable>
  );
}
