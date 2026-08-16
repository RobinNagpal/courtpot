import type { ReactElement } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMatchMutations, useMatches } from "@courtpot/api";
import { Button, ErrorState, LoadingState, confirmAsync } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { MatchForm } from "../../../components/MatchForm";

export default function EditMatchScreen(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matches = useMatches();
  const { update, remove } = useMatchMutations();

  if (matches.isPending) {
    return <LoadingState />;
  }
  if (matches.isError) {
    return <ErrorState message="Could not load the match." />;
  }

  const match = matches.data.find((row) => row.id === id);
  if (match === undefined) {
    return <ErrorState message="Match not found." />;
  }

  return (
    <Screen>
      <MatchForm
        initial={match}
        submitLabel="Save changes"
        onSubmit={(edited) => {
          update.mutate(edited);
          router.back();
        }}
      />
      <Button
        label="Delete match"
        variant="danger"
        onPress={() => {
          void confirmAsync("Delete match?", "This removes it from the rankings.").then((confirmed) => {
            if (confirmed) {
              remove.mutate(match.id);
              router.back();
            }
          });
        }}
      />
    </Screen>
  );
}
