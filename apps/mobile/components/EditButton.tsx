import type { ReactElement } from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/** Pencil in the header: from a view page to its edit page. */
export function EditButton({ href }: { href: string }): ReactElement {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Edit"
      className="ml-2 rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
    >
      <Ionicons name="pencil" size={18} color="#0f172a" />
    </Pressable>
  );
}
