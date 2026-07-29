import type { ReactElement } from "react";
import { View } from "react-native";
import { Button, confirmAsync } from "@courtpot/ui";

interface RowActionsProps {
  onEdit: () => void;
  /** What the confirmation dialog describes, e.g. "Sam → Robin: $5.00". */
  deleteSubject: string;
  deleteDetail?: string;
  onDelete: () => void;
}

/**
 * Edit and Delete for one row. Deleting always asks first — there is no
 * unconfirmed delete anywhere in the app.
 */
export function RowActions({ onEdit, deleteSubject, deleteDetail, onDelete }: RowActionsProps): ReactElement {
  const handleDelete = async (): Promise<void> => {
    const confirmed = await confirmAsync(
      `Delete ${deleteSubject}?`,
      deleteDetail ?? "This cannot be undone.",
    );
    if (confirmed) {
      onDelete();
    }
  };

  return (
    <View className="flex-row gap-2 pb-2 pl-3">
      <View className="flex-1">
        <Button label="Edit" variant="ghost" onPress={onEdit} />
      </View>
      <View className="flex-1">
        <Button
          label="Delete"
          variant="danger"
          onPress={() => {
            void handleDelete();
          }}
        />
      </View>
    </View>
  );
}
