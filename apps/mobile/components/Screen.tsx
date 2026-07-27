import type { ReactElement, ReactNode } from "react";
import { ScrollView } from "react-native";
import { screenClass } from "@courtpot/ui";

/** Standard scrollable screen container with shared padding. */
export function Screen({ children }: { children: ReactNode }): ReactElement {
  return (
    <ScrollView className={screenClass} contentContainerClassName="gap-4 p-4 pb-12">
      {children}
    </ScrollView>
  );
}
