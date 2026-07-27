import type { ReactElement } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: string; size: number }): ReactElement => (
    <Ionicons name={name} color={color} size={size} />
  );

export default function TabsLayout(): ReactElement {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Balances", tabBarIcon: tabIcon("wallet-outline") }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarIcon: tabIcon("calendar-outline") }} />
      <Tabs.Screen name="transfers" options={{ title: "Transfers", tabBarIcon: tabIcon("swap-horizontal-outline") }} />
      <Tabs.Screen name="people" options={{ title: "People", tabBarIcon: tabIcon("people-outline") }} />
    </Tabs>
  );
}
