"use client";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const setup = /MONGODB_URI|AUTH_SECRET/.test(error.message);
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl">{setup ? "Database not connected yet" : "Something went wrong"}</h1>
      <p className="mt-3 text-sm">
        {setup
          ? "Add your MongoDB connection string and AUTH_SECRET to .env.local, then restart the server. See the README for the 3-minute setup."
          : "We could not load this page. Please try again in a moment."}
      </p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
