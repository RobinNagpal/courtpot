export const queryKeys = {
  members: ["members"],
  guests: ["guests"],
  memberBookings: ["memberBookings"],
  guestBookings: ["guestBookings"],
  transfers: ["transfers"],
  matches: ["matches"],
} as const;

export type CollectionKey = keyof typeof queryKeys;
export type CollectionQueryKey = (typeof queryKeys)[CollectionKey];
