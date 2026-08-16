import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { usePairRankings } from "@courtpot/api";
import { ErrorState, LoadingState, cardClass } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { PairRankingRows } from "../components/PairRankingRows";
import { usePersonNames } from "../lib/people";
import { useActiveTeamId } from "../lib/team";

export default function RankingsScreen(): ReactElement {
  const teamId = useActiveTeamId();
  const { rankings, isPending, isError } = usePairRankings(teamId);
  const names = usePersonNames();

  if (isPending) {
    return <LoadingState />;
  }
  if (isError) {
    return <ErrorState message="Could not load rankings." />;
  }

  return (
    <Screen nav>
      <View className={cardClass}>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          {rankings.length === 0
            ? "Pairs appear here once doubles matches are recorded."
            : `${rankings.length} pair${rankings.length === 1 ? "" : "s"}, most wins first. Singles are not ranked.`}
        </Text>
      </View>

      <PairRankingRows
        rankings={rankings}
        nameOf={(personId) => names.get(personId) ?? "?"}
        empty="No pairs yet. Record a doubles match to start the table."
      />
    </Screen>
  );
}
