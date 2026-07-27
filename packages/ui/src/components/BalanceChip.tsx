import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { balanceStatus } from "@courtpot/domain";
import { formatCents } from "../format";
import { balanceChipClass, balanceTextClass } from "../tokens";

/** Colour + text, never colour alone: "+$18.00 owed" / "−$30.00 credit" / "settled". */
export function BalanceChip({ owedCents }: { owedCents: number }): ReactElement {
  const status = balanceStatus(owedCents);
  const label =
    status === "owes"
      ? `+${formatCents(owedCents)} owed`
      : status === "credit"
        ? `−${formatCents(-owedCents)} credit`
        : "settled";
  return (
    <View className={`rounded-full px-3 py-1 ${balanceChipClass[status]}`}>
      <Text className={`text-sm font-semibold ${balanceTextClass[status]}`}>{label}</Text>
    </View>
  );
}
