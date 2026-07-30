import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { initialsFrom, tintFor } from "../initials";

/** A person as a small tinted circle of initials. */
export function Avatar({ name }: { name: string }): ReactElement {
  const tint = tintFor(name);
  return (
    <View className={`h-7 w-7 items-center justify-center rounded-full ${tint.bg}`}>
      <Text className={`text-[11px] font-bold ${tint.text}`}>{initialsFrom(name)}</Text>
    </View>
  );
}

export interface AvatarPerson {
  id: string;
  name: string;
}

interface AvatarRowProps {
  people: readonly AvatarPerson[];
  /** Beyond this many, the rest collapse into a +n circle. */
  max?: number;
  /** Makes each circle tappable. Omit on read-only surfaces. */
  onPress?: (id: string) => void;
}

/** The people on a booking, at a glance. */
export function AvatarRow({ people, max = 6, onPress }: AvatarRowProps): ReactElement | null {
  if (people.length === 0) {
    return null;
  }
  const shown = people.slice(0, max);
  const hidden = people.length - shown.length;
  return (
    <View className="flex-row flex-wrap items-center gap-1 pt-1.5">
      {shown.map((person) =>
        onPress === undefined ? (
          <Avatar key={person.id} name={person.name} />
        ) : (
          <Pressable
            key={person.id}
            onPress={() => onPress(person.id)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={person.name}
          >
            <Avatar name={person.name} />
          </Pressable>
        ),
      )}
      {hidden > 0 ? (
        <View className="h-7 items-center justify-center rounded-full bg-neutral-200 px-2 dark:bg-neutral-700">
          <Text className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">{`+${hidden}`}</Text>
        </View>
      ) : null}
    </View>
  );
}
