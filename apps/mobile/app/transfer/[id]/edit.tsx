import type { ReactElement } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTransferMutations, useTransfers } from "@courtpot/api";
import { ErrorState, LoadingState } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { TransferForm } from "../../../components/TransferForm";

export default function EditTransferScreen(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transfers = useTransfers();
  const { update } = useTransferMutations();

  if (transfers.isPending) {
    return <LoadingState />;
  }
  if (transfers.isError) {
    return <ErrorState message="Could not load the transfer." />;
  }

  const transfer = transfers.data.find((row) => row.id === id);
  if (transfer === undefined) {
    return <ErrorState message="Transfer not found." />;
  }

  return (
    <Screen>
      <TransferForm
        initial={transfer}
        submitLabel="Save changes"
        onSubmit={(edited) => {
          update.mutate(edited);
          router.back();
        }}
      />
    </Screen>
  );
}
