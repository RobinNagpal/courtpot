import type { ReactElement } from "react";
import { Text, View } from "react-native";
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

interface AvatarRowProps {
  names: readonly string[];
  /** Beyond this many, the rest collapse into a +n circle. */
  max?: number;
}

/** The people on a booking, at a glance. */
export function AvatarRow({ names, max = 6 }: AvatarRowProps): ReactElement | null {
  if (names.length === 0) {
    return null;
  }
  const shown = names.slice(0, max);
  const hidden = names.length - shown.length;
  return (
    <View className="flex-row flex-wrap items-center gap-1 pt-1.5">
      {shown.map((name, index) => (
        <Avatar key={`${name}-${index}`} name={name} />
      ))}
      {hidden > 0 ? (
        <View className="h-7 items-center justify-center rounded-full bg-neutral-200 px-2 dark:bg-neutral-700">
          <Text className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">{`+${hidden}`}</Text>
        </View>
      ) : null}
    </View>
  );
}
