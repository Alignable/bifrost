import React from "react";
import { useData } from "vike-react/useData";
import { eventIconPaths as iconPaths, eventsJsonLd, type BenchEvent } from "../../../../bench/fixtures/events";
import type data from "./+data";

const CARD_CLASS = "group flex flex-col overflow-hidden rounded-xl border border-solid border-grey-350 bg-white-100 shadow-sm transition-shadow duration-300 hover:shadow-large";
const CHIP_CLASS = "inline-flex cursor-pointer items-center gap-x-1.5 rounded-full border border-solid border-grey-350 px-3 py-1.5 text-body-medium text-black-800 has-[:checked]:border-purple-400 has-[:checked]:bg-purple-100";

const dateFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

function Icon({ path }: { path: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" height="1em" fill="currentColor" className="h-4 w-4 shrink-0 text-grey-600">
      <path d={path} />
    </svg>
  );
}

function EventCard({ event }: { event: BenchEvent }) {
  const href = `/networking-events/${event.slug}`;
  return (
    <article className={CARD_CLASS} data-testid="event-card">
      <a href={href} className="block aspect-[2/1] overflow-hidden">
        <img src={event.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      </a>
      <div className="flex flex-1 flex-col gap-y-2 p-4">
        <h3 className="m-0 line-clamp-2 text-subheading-bold">
          <a href={href} className="text-black-800 no-underline hover:text-purple-500">
            {event.title}
          </a>
        </h3>
        <div className="flex items-center gap-x-1.5 text-body-medium text-grey-700">
          <Icon path={iconPaths[0]} />
          <span>{dateFormat.format(new Date(event.startsAt))}</span>
        </div>
        <div className="flex items-center gap-x-1.5 text-body-medium text-grey-700">
          <Icon path={iconPaths[1]} />
          <span className="truncate">{`${event.venue.name}, ${event.venue.city}, ${event.venue.state}`}</span>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="flex -space-x-2">
            {event.attendees.edges.slice(0, 3).map(({ node }) => (
              <img key={node.id} src={node.avatarUrl} alt={node.name} className="h-7 w-7 rounded-full border-2 border-solid border-white-100" />
            ))}
          </div>
          <span className="text-body-medium text-grey-600">{event.attendeeCount} attending</span>
        </div>
      </div>
    </article>
  );
}

export default function Page() {
  const { events, filters } = useData<Awaited<ReturnType<typeof data>>>();
  return (
    <main className="mx-auto box-content max-w-[1200px] px-4 py-8 md:px-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd(events), null, 2) }} />
      <div className="flex flex-col gap-y-4">
        <h1 className="m-0 text-heading-2">Business Networking Events</h1>
        <form className="flex flex-col gap-3 md:flex-row" role="search">
          <label className="flex flex-1 items-center gap-x-2 rounded-xl border border-solid border-grey-350 px-4 py-3">
            <Icon path={iconPaths[2]} />
            <input type="search" name="q" placeholder="Search events" className="w-full border-none outline-none" defaultValue="" />
          </label>
          <label className="flex flex-1 items-center gap-x-2 rounded-xl border border-solid border-grey-350 px-4 py-3">
            <Icon path={iconPaths[1]} />
            <input type="text" name="location" placeholder="City or zip" className="w-full border-none outline-none" defaultValue="" />
          </label>
          <button type="submit" className="rounded-full border-none bg-purple-400 px-6 py-3 text-body-bold text-white-100">
            Search
          </button>
        </form>
        <fieldset className="m-0 flex flex-wrap gap-2 border-none p-0">
          {filters.map((filter) => (
            <label key={filter} className={CHIP_CLASS}>
              <input type="checkbox" name="filter" value={filter} className="sr-only" />
              <Icon path={iconPaths[3]} />
              <span>{filter}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.slice(0, 18).map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </section>
      <nav aria-label="Pagination" className="mt-8 flex justify-center gap-x-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <a key={n} href={`/bench/events?page=${n}`} aria-current={n === 1 ? "page" : undefined} className="rounded-full px-3 py-1.5 no-underline">
            {n}
          </a>
        ))}
      </nav>
    </main>
  );
}
