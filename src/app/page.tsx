import { redirect } from "next/navigation";

export default function RootPage() {
  // If the rewrite to /site/index.html is not triggered, redirect to events
  redirect("/events");
}
