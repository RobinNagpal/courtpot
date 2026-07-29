import type { ReactElement, ReactNode } from "react";
import { ScrollView } from "react-native";
import { screenClass } from "@courtpot/ui";
import { AppNav } from "./AppNav";

interface ScreenProps {
  children: ReactNode;
  /** Show the shared navigation bar. Section screens do; modals do not. */
  nav?: boolean;
}

/** Standard scrollable screen container with shared padding. */
export function Screen({ children, nav = false }: ScreenProps): ReactElement {
  return (
    <ScrollView className={screenClass} contentContainerClassName="gap-4 p-4 pb-12">
      {nav ? <AppNav /> : null}
      {children}
    </ScrollView>
  );
}
