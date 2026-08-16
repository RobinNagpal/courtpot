import type { ReactElement } from "react";
import { useRouter } from "expo-router";
import { useMatchMutations } from "@courtpot/api";
import { Screen } from "../../components/Screen";
import { MatchForm } from "../../components/MatchForm";

export default function NewMatchScreen(): ReactElement {
  const router = useRouter();
  const { create } = useMatchMutations();
  return (
    <Screen>
      <MatchForm
        submitLabel="Record match"
        onSubmit={(match) => {
          create.mutate(match);
          router.back();
        }}
      />
    </Screen>
  );
}
