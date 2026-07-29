import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { memberBookingSplit } from "@courtpot/domain";
import type { BalanceT, TeamPageT } from "@courtpot/schemas";
import {
  Avatar,
  AvatarRow,
  BalanceChip,
  Button,
  EmptyState,
  Input,
  ListItem,
  SectionTitle,
  cardClass,
  formatCents,
} from "@courtpot/ui";
import { Screen } from "../../components/Screen";
import { FormError } from "../../components/FormError";
import { NavChips } from "../../components/NavChips";
import type { NavIconName } from "../../components/NavChips";
import { guestBookingSubtitle, guestLabel } from "../../lib/bookings";
import { publicTeamApi } from "../../lib/storage";

type Section = "balances" | "members" | "guests" | "memberBookings" | "guestBookings" | "transfers";

const SECTIONS: readonly { key: Section; label: string; icon: NavIconName }[] = [
  { key: "balances", label: "Balances", icon: "wallet-outline" },
  { key: "members", label: "Members", icon: "people-outline" },
  { key: "guests", label: "Guests", icon: "person-add-outline" },
  { key: "memberBookings", label: "Member bookings", icon: "calendar-outline" },
  { key: "guestBookings", label: "Guest bookings", icon: "receipt-outline" },
  { key: "transfers", label: "Transfers", icon: "swap-horizontal-outline" },
];

/**
 * Read-only team page, opened with the team's PIN rather than a login.
 *
 * Sections switch in local state rather than by route: unlock returns the whole
 * team in one response, so moving between them needs no refetch and never asks
 * for the PIN again. Nothing here edits — no row menus, no add buttons, no
 * team switcher.
 */
export default function PublicTeamScreen(): ReactElement {
  // A slug like "sher-e-smash", or the raw team id.
  const { team: handle } = useLocalSearchParams<{ team: string }>();
  const [pin, setPin] = useState("");
  const [page, setPage] = useState<TeamPageT | null>(null);
  const [section, setSection] = useState<Section>("balances");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlock = async (): Promise<void> => {
    if (publicTeamApi === null) {
      setError("This build has no API configured, so team pages are unavailable.");
      return;
    }
    setBusy(true);
    try {
      setPage(await publicTeamApi.unlock(handle, pin));
      setError(null);
    } catch (problem) {
      setPage(null);
      setError(problem instanceof Error ? problem.message : "Could not open this team.");
    } finally {
      setBusy(false);
    }
  };

  if (page === null) {
    return (
      <Screen>
        <View className={cardClass}>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Team page</Text>
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">
            Enter the team PIN to view this team. Read-only.
          </Text>
        </View>
        <Input
          label="Team PIN"
          value={pin}
          onChangeText={setPin}
          placeholder="4 digits"
          keyboardType="number-pad"
        />
        <FormError message={error} />
        <Button
          label={busy ? "Opening…" : "View team"}
          onPress={() => {
            void unlock();
          }}
        />
      </Screen>
    );
  }

  const names = new Map<string, string>(
    [...page.members, ...page.guests].map((person) => [person.id, person.name]),
  );
  const nameOf = (id: string): string => names.get(id) ?? "?";

  return (
    <Screen>
      <View className={cardClass}>
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{page.team.name}</Text>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">View only</Text>
      </View>

      <NavChips
        chips={SECTIONS.map((entry) => ({
          key: entry.key,
          label: entry.label,
          icon: entry.icon,
          active: section === entry.key,
          onPress: () => setSection(entry.key),
        }))}
      />

      {section === "balances" ? <Balances balances={page.balances} /> : null}

      {section === "members" ? (
        <>
          <SectionTitle label="Members" />
          <People people={page.members} empty="No members yet." />
        </>
      ) : null}

      {section === "guests" ? (
        <>
          <SectionTitle label="Guests" />
          <People people={page.guests} empty="No guests yet." />
        </>
      ) : null}

      {section === "memberBookings" ? (
        <>
          <SectionTitle label="Member bookings" />
          {page.memberBookings.length === 0 ? (
            <EmptyState message="No member bookings yet." />
          ) : (
            <View>
              {page.memberBookings.map((booking) => {
                const total = Object.values(memberBookingSplit(booking)).reduce((sum, share) => sum + share, 0);
                return (
                  <ListItem
                    key={booking.id}
                    title={booking.title === "" ? "Member booking" : booking.title}
                    subtitle={`${booking.date} · ${booking.memberIds.length} players · ${formatCents(total)} total`}
                    footer={<AvatarRow names={booking.memberIds.map(nameOf)} />}
                  />
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {section === "guestBookings" ? (
        <>
          <SectionTitle label="Guest bookings" />
          {page.guestBookings.length === 0 ? (
            <EmptyState message="No guest bookings yet." />
          ) : (
            <View>
              {page.guestBookings.map((booking) => (
                <ListItem
                  key={booking.id}
                  title={booking.title === "" ? `Guest: ${guestLabel(booking, names)}` : booking.title}
                  subtitle={guestBookingSubtitle(booking, names)}
                  footer={<AvatarRow names={booking.guests.map((charge) => nameOf(charge.guestId))} />}
                />
              ))}
            </View>
          )}
        </>
      ) : null}

      {section === "transfers" ? (
        <>
          <SectionTitle label="Transfers" />
          {page.transfers.length === 0 ? (
            <EmptyState message="No transfers yet." />
          ) : (
            <View>
              {page.transfers.map((transfer) => (
                <ListItem
                  key={transfer.id}
                  title={`${nameOf(transfer.fromId)} → ${nameOf(transfer.toId)}: ${formatCents(transfer.amount)}`}
                  subtitle={`${transfer.date}${transfer.note === undefined ? "" : ` · ${transfer.note}`}`}
                />
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function Balances({ balances }: { balances: readonly BalanceT[] }): ReactElement {
  const members = balances.filter((balance) => balance.kind === "member");
  const guests = balances.filter((balance) => balance.kind === "guest");
  const row = (balance: BalanceT): ReactElement => (
    <ListItem key={balance.personId} title={balance.name} right={<BalanceChip owedCents={balance.owedCents} />} />
  );
  return (
    <>
      <SectionTitle label="Members" />
      {members.length === 0 ? <EmptyState message="No members yet." /> : <View>{members.map(row)}</View>}
      <SectionTitle label="Guests" />
      {guests.length === 0 ? <EmptyState message="No guests yet." /> : <View>{guests.map(row)}</View>}
    </>
  );
}

function People({
  people,
  empty,
}: {
  people: readonly { id: string; name: string }[];
  empty: string;
}): ReactElement {
  if (people.length === 0) {
    return <EmptyState message={empty} />;
  }
  return (
    <View>
      {people.map((person) => (
        <ListItem key={person.id} title={person.name} right={<Avatar name={person.name} />} />
      ))}
    </View>
  );
}
