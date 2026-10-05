import { createRand } from "./rand";

// Server-only (generation is expensive). Modeled on the relay store (~165KB) behind Alignable's native networking
// events listing, all of which is passed to the client.

function buildEvents() {
  const r = createRand(4000);
  const person = () => ({
    __typename: "User",
    id: r.token(20),
    name: r.title(2),
    headline: r.sentence(8),
    avatarUrl: `https://images.example.test/avatar/${r.hex(24)}.jpg`,
    business: { __typename: "Business", id: r.token(20), name: r.title(3), slug: r.hex(10), city: r.title(1), state: "MA", category: r.title(2) },
  });
  const events = Array.from({ length: 30 }, (_, i) => ({
    __typename: "NetworkingEvent",
    id: r.token(24),
    slug: `${r.words(3).replace(/ /g, "-")}-${i}`,
    title: r.title(r.int(3, 7)),
    description: r.sentence(r.int(40, 80)),
    startsAt: new Date(Date.UTC(2026, 10, 1 + i, 13, 30)).toISOString(),
    endsAt: new Date(Date.UTC(2026, 10, 1 + i, 15, 0)).toISOString(),
    timezone: "America/New_York",
    format: r.pick(["IN_PERSON", "VIRTUAL", "HYBRID"]),
    priceCents: r.pick([0, 0, 0, 1500, 2500]),
    coverImageUrl: `https://images.example.test/events/${r.hex(24)}.jpg`,
    venue: { __typename: "Venue", id: r.token(20), name: r.title(3), address: `${r.int(1, 999)} ${r.title(2)} St`, city: r.title(1), state: "MA", lat: 42 + r.next(), lng: -71 - r.next() },
    organizer: person(),
    attendeeCount: r.int(3, 120),
    attendees: { __typename: "AttendeeConnection", edges: Array.from({ length: 8 }, () => ({ __typename: "AttendeeEdge", cursor: r.token(16), node: person() })) },
    tags: Array.from({ length: r.int(2, 5) }, () => r.words(1)),
    viewerRsvp: null,
  }));
  const filters = ["In person", "Virtual", "Hybrid", "Free", "This week", "This month", "Within 10 miles", "Within 50 miles"];
  return { events, filters };
}

export const eventsData = buildEvents();

export type BenchEvent = (typeof eventsData)["events"][number];
