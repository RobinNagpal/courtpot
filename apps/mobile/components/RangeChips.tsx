import type { ReactElement } from "react";
import { View } from "react-native";
import type { MatchRange } from "@courtpot/schemas";
import { Chip } from "@courtpot/ui";
import { MATCH_RANGES } from "../lib/matches";

interface RangeChipsProps {
  range: MatchRange;
  onChange: (range: MatchRange) => void;
}

/** All time / Today, shared by the matches list and the rankings table. */
export function RangeChips({ range, onChange }: RangeChipsProps): ReactElement {
  return (
    <View className="flex-row gap-2">
      {MATCH_RANGES.map((option) => (
        <Chip
          key={option.range}
          label={option.label}
          selected={range === option.range}
          onPress={() => onChange(option.range)}
        />
      ))}
    </View>
  );
}
