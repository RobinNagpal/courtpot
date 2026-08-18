import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { usePairRankings } from "@courtpot/api";
import { MatchRange } from "@courtpot/schemas";
import { ErrorState, LoadingState, cardClass } from "@courtpot/ui";
import { useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { PairRankingRows } from "../components/PairRankingRows";
import { RangeChips } from "../components/RangeChips";
import { rangeStart } from "../lib/matches";
import { usePersonNames } from "../lib/people";
import { useActiveTeamId } from "../lib/team";

export default function RankingsScreen(): ReactElement {
  const router = useRouter();
  const teamId = useActiveTeamId();
  const [range, setRange] = useState<MatchRange>(MatchRange.AllTime);
  const { rankings, isPending, isError } = usePairRankings(teamId, rangeStart(range) ?? undefined);
  const names = usePersonNames();

  if (isPending) {
    return <LoadingState />;
  }
  if (isError) {
    return <ErrorState message="Could not load rankings." />;
  }

  const today = range === MatchRange.Today;

  return (
    <Screen nav>
      <RangeChips range={range} onChange={setRange} />

      <View className={cardClass}>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          {rankings.length === 0
            ? `Pairs appear here once doubles matches are recorded${today ? " today" : ""}.`
            : `${rankings.length} pair${rankings.length === 1 ? "" : "s"}${
                today ? " today" : ""
              }, most wins first. Singles are not ranked.`}
        </Text>
      </View>

      <PairRankingRows
        rankings={rankings}
        nameOf={(personId) => names.get(personId) ?? "?"}
        onPressPair={(key) => router.push(`/pair/${key}`)}
        empty={today ? "No doubles matches played today." : "No pairs yet. Record a doubles match to start the table."}
      />
    </Screen>
  );
}
