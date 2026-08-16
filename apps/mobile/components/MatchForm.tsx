import { Fragment, useState } from "react";
import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { Match, PLAYERS_PER_SIDE_DEFAULT } from "@courtpot/schemas";
import type { MatchT } from "@courtpot/schemas";
import { Button, Chip, Input, SectionTitle } from "@courtpot/ui";
import { firstIssueMessage } from "../lib/forms";
import { newId } from "../lib/id";
import { isoToLocalDateTimeText, localDateTimeTextToIso, nowLocalDateTimeText } from "../lib/date";
import { usePersonOptions } from "../lib/people";
import { useActiveTeamId } from "../lib/team";
import { ChipGroup } from "./ChipGroup";
import { FormError } from "./FormError";

/**
 * Four slots laid out as they read on court: 0 & 1 make up one side, 2 & 3 the
 * other. Singles keeps the array shape and hides the second slot of each side —
 * and empties it, so what is on screen is the whole of the state.
 */
const SIDE_A_SLOTS = [0, 1];
const SIDE_B_SLOTS = [2, 3];
/** The second slot of each side — present only in doubles. */
const HIDDEN_IN_SINGLES = [1, 3];
const SLOT_LABELS = ["P1", "P2", "P3", "P4"];

type PlayersPerSide = 1 | 2;

interface MatchFormProps {
  initial?: MatchT;
  submitLabel: string;
  onSubmit: (match: MatchT) => void;
}

function slotsFrom(match: MatchT | undefined): (string | null)[] {
  const [a1, a2] = match?.sideA.playerIds ?? [];
  const [b1, b2] = match?.sideB.playerIds ?? [];
  return [a1 ?? null, a2 ?? null, b1 ?? null, b2 ?? null];
}

/** Points are whole and never negative, so anything else is not a score. */
function parsePoints(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

export function MatchForm({ initial, submitLabel, onSubmit }: MatchFormProps): ReactElement {
  const teamId = useActiveTeamId();
  const people = usePersonOptions();
  const [playersPerSide, setPlayersPerSide] = useState<PlayersPerSide>(
    initial === undefined || initial.sideA.playerIds.length === PLAYERS_PER_SIDE_DEFAULT ? 2 : 1,
  );
  const [slots, setSlots] = useState<(string | null)[]>(slotsFrom(initial));
  const [playedAtText, setPlayedAtText] = useState(
    initial === undefined ? nowLocalDateTimeText() : isoToLocalDateTimeText(initial.playedAt),
  );
  const [pointsA, setPointsA] = useState(initial === undefined ? "" : String(initial.sideA.points));
  const [pointsB, setPointsB] = useState(initial === undefined ? "" : String(initial.sideB.points));
  // Which slot's picker is open. Only one at a time, so the list stays short.
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Singles hides the second slot of each side. Clearing them on the way is what
   * keeps the form honest: left in place they are invisible, so the picker's
   * "already on court" exclusion cannot see them and would offer somebody who is
   * still parked there — and switching back would show a player the user never
   * picked twice.
   */
  const setFormat = (perSide: PlayersPerSide): void => {
    setPlayersPerSide(perSide);
    setOpenSlot(null);
    if (perSide === 1) {
      setSlots((prev) => prev.map((personId, index) => (HIDDEN_IN_SINGLES.includes(index) ? null : personId)));
    }
  };

  const usedSlots = (side: readonly number[]): number[] => side.slice(0, playersPerSide);
  const activeSlots = [...usedSlots(SIDE_A_SLOTS), ...usedSlots(SIDE_B_SLOTS)];
  const nameOf = (personId: string): string => people.find((p) => p.id === personId)?.name ?? "Unknown";

  const pick = (slot: number, personId: string | null): void => {
    setSlots((prev) => prev.map((existing, index) => (index === slot ? personId : existing)));
    setOpenSlot(null);
  };

  const playerIdsFor = (side: readonly number[]): string[] =>
    usedSlots(side)
      .map((slot) => slots[slot])
      .filter((personId): personId is string => personId !== null);

  const handleSubmit = (): void => {
    if (playerIdsFor(SIDE_A_SLOTS).length !== playersPerSide || playerIdsFor(SIDE_B_SLOTS).length !== playersPerSide) {
      setError("Pick every player before saving.");
      return;
    }
    const scoreA = parsePoints(pointsA);
    const scoreB = parsePoints(pointsB);
    if (scoreA === null || scoreB === null) {
      setError("Enter both scores as whole numbers.");
      return;
    }
    const playedAt = localDateTimeTextToIso(playedAtText);
    if (playedAt === null) {
      setError("Enter the date and time as YYYY-MM-DD HH:MM.");
      return;
    }
    const result = Match.safeParse({
      id: initial?.id ?? newId(),
      teamId: initial?.teamId ?? teamId,
      playedAt,
      sideA: { playerIds: playerIdsFor(SIDE_A_SLOTS), points: scoreA },
      sideB: { playerIds: playerIdsFor(SIDE_B_SLOTS), points: scoreB },
    });
    if (!result.success) {
      setError(firstIssueMessage(result.error));
      return;
    }
    setError(null);
    onSubmit(result.data);
  };

  const slotButton = (slot: number): ReactElement => {
    const personId = slots[slot] ?? null;
    const open = openSlot === slot;
    return (
      <Pressable
        key={slot}
        onPress={() => setOpenSlot(open ? null : slot)}
        accessibilityRole="button"
        accessibilityLabel={`${SLOT_LABELS[slot] ?? "Player"}: ${personId === null ? "not picked" : nameOf(personId)}`}
        className={`flex-1 items-center rounded-xl border px-3 py-3 ${
          open
            ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950"
            : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
        }`}
      >
        <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{SLOT_LABELS[slot]}</Text>
        <Text
          className={`text-base font-semibold ${
            personId === null ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-900 dark:text-neutral-50"
          }`}
        >
          {personId === null ? "Tap to pick" : nameOf(personId)}
        </Text>
      </Pressable>
    );
  };

  const sideRow = (side: readonly number[]): ReactElement => (
    <View className="flex-row items-center gap-2">
      {usedSlots(side).map((slot, index) => (
        <Fragment key={slot}>
          {index > 0 ? <Text className="text-sm text-neutral-500 dark:text-neutral-400">&</Text> : null}
          {slotButton(slot)}
        </Fragment>
      ))}
    </View>
  );

  const picker = (slot: number): ReactElement => {
    const personId = slots[slot] ?? null;
    // Somebody already on court cannot be picked again, so they leave the list.
    const taken = activeSlots.filter((other) => other !== slot).flatMap((other) => slots[other] ?? []);
    return (
      <ChipGroup
        label={`Who is ${SLOT_LABELS[slot]}?`}
        options={people
          .filter((person) => !taken.includes(person.id))
          .map((person) => ({
            id: person.id,
            label: person.kind === "guest" ? `${person.name} (guest)` : person.name,
          }))}
        selectedIds={personId === null ? [] : [personId]}
        onToggle={(picked) => pick(slot, personId === picked ? null : picked)}
      />
    );
  };

  const sideName = (side: readonly number[], label: string): string => {
    const names = playerIdsFor(side).map(nameOf);
    return names.length === 0 ? label : names.join(" & ");
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <Chip label="Doubles" selected={playersPerSide === 2} onPress={() => setFormat(2)} />
        <Chip label="Singles" selected={playersPerSide === 1} onPress={() => setFormat(1)} />
      </View>

      <View className="gap-2">
        <Input
          label="Played at"
          value={playedAtText}
          onChangeText={setPlayedAtText}
          placeholder="YYYY-MM-DD HH:MM"
        />
        <Button label="Now" variant="ghost" onPress={() => setPlayedAtText(nowLocalDateTimeText())} />
      </View>

      <SectionTitle label="Players" />
      {sideRow(SIDE_A_SLOTS)}
      <Text className="text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">vs</Text>
      {sideRow(SIDE_B_SLOTS)}
      {openSlot === null ? null : picker(openSlot)}

      <SectionTitle label="Result" />
      <Input
        label={`Points for ${sideName(SIDE_A_SLOTS, "side A")}`}
        value={pointsA}
        onChangeText={setPointsA}
        placeholder="0"
        keyboardType="number-pad"
      />
      <Input
        label={`Points for ${sideName(SIDE_B_SLOTS, "side B")}`}
        value={pointsB}
        onChangeText={setPointsB}
        placeholder="0"
        keyboardType="number-pad"
      />

      <FormError message={error} />
      <Button label={submitLabel} onPress={handleSubmit} />
    </View>
  );
}
