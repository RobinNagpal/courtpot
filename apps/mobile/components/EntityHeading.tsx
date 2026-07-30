import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { Avatar, cardClass } from "@courtpot/ui";

interface EntityHeadingProps {
  name: string;
  subtitle?: string;
  /** Show a circle of initials beside the name. */
  withAvatar?: boolean;
}

/**
 * The entity's name, in the content rather than the header bar. Headers stay a
 * generic label ("Member", "Booking") so a long name never gets truncated into
 * the title.
 */
export function EntityHeading({ name, subtitle, withAvatar = false }: EntityHeadingProps): ReactElement {
  return (
    <View className={`${cardClass} flex-row items-center gap-3`}>
      {withAvatar ? <Avatar name={name} /> : null}
      <View className="flex-1">
        <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{name}</Text>
        {subtitle === undefined ? null : (
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</Text>
        )}
      </View>
    </View>
  );
}
