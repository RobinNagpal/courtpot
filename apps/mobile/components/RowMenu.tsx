import { useState } from "react";
import type { ReactElement } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { confirmAsync } from "@courtpot/ui";

export interface RowMenuAction {
  label: string;
  destructive?: boolean;
  /** Asked before the action runs. Every delete supplies one. */
  confirm?: { title: string; message: string };
  /** Shown greyed out with this reason instead of acting. */
  disabledReason?: string;
  onPress: () => void;
}

interface RowMenuProps {
  actions: readonly RowMenuAction[];
  /** Screen-reader label, e.g. "Actions for Sam". */
  accessibilityLabel?: string;
}

/**
 * Three dots on the row itself; tapping opens the actions for that entity.
 * Keeps rows compact — Edit and Delete no longer take a line each.
 */
export function RowMenu({ actions, accessibilityLabel }: RowMenuProps): ReactElement {
  const [open, setOpen] = useState(false);

  const run = async (action: RowMenuAction): Promise<void> => {
    // Close first: on web confirmAsync is window.confirm, which would otherwise
    // sit behind the sheet.
    setOpen(false);
    if (action.disabledReason !== undefined) {
      await confirmAsync("Not available", action.disabledReason);
      return;
    }
    if (action.confirm !== undefined && !(await confirmAsync(action.confirm.title, action.confirm.message))) {
      return;
    }
    action.onPress();
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? "More actions"}
        className="px-2 py-1"
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <View className="gap-1 rounded-t-2xl bg-white p-2 dark:bg-neutral-900">
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  void run(action);
                }}
                className="rounded-xl px-4 py-3 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <Text
                  className={`text-base font-medium ${
                    action.disabledReason !== undefined
                      ? "text-neutral-400 dark:text-neutral-600"
                      : action.destructive === true
                        ? "text-red-600 dark:text-red-400"
                        : "text-neutral-900 dark:text-neutral-100"
                  }`}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setOpen(false)}
              className="rounded-xl px-4 py-3 active:bg-neutral-100 dark:active:bg-neutral-800"
            >
              <Text className="text-base text-neutral-500 dark:text-neutral-400">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
