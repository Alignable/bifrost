import type { BenchEvent } from "./eventsData";
import { createRand } from "./rand";

export type { BenchEvent };

const r = createRand(4100);
export const eventIconPaths = Array.from({ length: 4 }, () => r.svgPath(r.int(300, 1200)));

export function eventsJsonLd(events: BenchEvent[]) {
  return {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: "Business Networking Events",
    mainEntity: events.map((e) => ({
      "@type": "Event",
      name: e.title,
      description: e.description,
      startDate: e.startsAt,
      endDate: e.endsAt,
      location: { "@type": "Place", name: e.venue.name, address: { "@type": "PostalAddress", streetAddress: e.venue.address, addressLocality: e.venue.city, addressRegion: e.venue.state } },
      organizer: { "@type": "Person", name: e.organizer.name },
      image: e.coverImageUrl,
    })),
  };
}
