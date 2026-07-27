import type { ReactElement } from "react";
import { useRouter } from "expo-router";
import { useTransferMutations } from "@courtpot/api";
import { Screen } from "../../components/Screen";
import { TransferForm } from "../../components/TransferForm";

export default function NewTransferScreen(): ReactElement {
  const router = useRouter();
  const { create } = useTransferMutations();
  return (
    <Screen>
      <TransferForm
        submitLabel="Record transfer"
        onSubmit={(transfer) => {
          create.mutate(transfer);
          router.back();
        }}
      />
    </Screen>
  );
}
