import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { Avatar } from "@courtpot/ui";
import type { AvatarPerson } from "@courtpot/ui";

interface PlayerLinesProps {
  people: readonly AvatarPerson[];
  /** The winning side reads heavier than the one it beat. */
  emphasis?: boolean;
}

/**
 * A side's players, one per line.
 *
 * Names go under each other rather than joined with "&": full names run long —
 * a two-name line truncates the second person away entirely on a phone, which
 * is the one thing a match row must never do.
 */
export function PlayerLines({ people, emphasis = false }: PlayerLinesProps): ReactElement {
  return (
    <View className="gap-1">
      {people.map((person) => (
        <View key={person.id} className="flex-row items-center gap-2">
          <Avatar name={person.name} />
          <Text
            numberOfLines={1}
            className={`flex-1 text-base ${
              emphasis
                ? "font-semibold text-neutral-900 dark:text-neutral-50"
                : "text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {person.name}
          </Text>
        </View>
      ))}
    </View>
  );
}
