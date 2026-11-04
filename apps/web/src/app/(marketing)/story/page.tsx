import { redirect } from "next/navigation";

// The story also lives on the home page as a scroll.
export default async function StoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value != null) query.append(key, value);
  }
  const search = query.toString();
  redirect(search ? `/?${search}` : "/");
}
