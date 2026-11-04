import { redirect } from "next/navigation";

// The film became the home page; old links still land there, keeping ?velvet=.
export default async function FilmPage({
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
