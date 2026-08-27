import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div data-page="not-found" className="flex min-h-dvh items-center justify-center px-5">
      <div className="card-surface max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Nothing here
        </h1>
        <p className="mt-2 text-ink-soft">
          This page doesn&rsquo;t exist, or it isn&rsquo;t yours to see.
        </p>
        <div className="mt-6">
          <LinkButton href="/discover">Go to Discover</LinkButton>
        </div>
      </div>
    </div>
  );
}
