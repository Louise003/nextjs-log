import Link from "next/link";
import { type SanityDocument } from "next-sanity";

import { client } from "@/sanity/client";

const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc){_id, title, slug, publishedAt}`;

const options = { next: { revalidate: 30 } };

// Monday-start of the week containing `date`.
function getWeekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day + 6) % 7; // days since Monday
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

// ISO 8601 week number (weeks start Monday, week 1 contains the first Thursday of the year).
function getISOWeekNumber(weekStart: Date) {
  const thursday = new Date(weekStart);
  thursday.setDate(thursday.getDate() + 3);

  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const daysSinceYearStart = Math.floor(
    (thursday.getTime() - yearStart.getTime()) / 86400000,
  );

  return Math.floor(daysSinceYearStart / 7) + 1;
}

function formatWeekLabel(weekStart: Date) {
  return `Uge ${getISOWeekNumber(weekStart)}`;
}

function groupPostsByWeek(posts: SanityDocument[]) {
  const groups = new Map<number, { weekStart: Date; posts: SanityDocument[] }>();

  for (const post of posts) {
    const weekStart = getWeekStart(new Date(post.publishedAt));
    const key = weekStart.getTime();

    if (!groups.has(key)) {
      groups.set(key, { weekStart, posts: [] });
    }
    groups.get(key)!.posts.push(post);
  }

  for (const group of groups.values()) {
    group.posts.sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
    );
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.weekStart.getTime() - a.weekStart.getTime(),
  );
}

export default async function IndexPage() {
  const posts = await client.fetch<SanityDocument[]>(POSTS_QUERY, {}, options);
  const weekGroups = groupPostsByWeek(posts);

  return (
    <main className="container mx-auto min-h-screen max-w-3xl p-8">
      <h1 className="font-playfair text-6xl font-bold text-blue-900">LOG</h1>
      <h2 className="font-dosis mb-4 text-pink-500">NoA Ignite</h2>
      <div className="grid grid-cols-3 gap-x-8">
        {weekGroups.map(({ weekStart, posts }) => (
          <section key={weekStart.getTime()}>
            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {formatWeekLabel(weekStart)}
            </h3>
            <ul className="flex flex-col gap-y-2">
              {posts.map((post) => (
                <li className="hover:underline" key={post._id}>
                  <Link href={`/${post.slug.current}`}>
                    <h2 className="font-dosis text-lg font-semibold">{post.title}</h2>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
