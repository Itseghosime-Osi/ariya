import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary-container/50 flex items-center justify-center text-wine text-2xl font-display mb-4">
        À
      </div>
      <h1 className="font-display text-4xl font-semibold text-primary mb-2">
        Page not found
      </h1>
      <p className="text-on-surface-variant max-w-md mb-6 text-sm">
        The celebration page or link you are looking for doesn&apos;t exist or
        has been moved.
      </p>
      <div className="flex gap-3">
        <Button asChild variant="primary">
          <Link href="/events">Return to celebrations</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
