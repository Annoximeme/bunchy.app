import Link from "next/link";
import { Avatar, Card } from "@/components/ui";
import type { OutcomeReview } from "@/server/modules/activities/outcomes";

/**
 * The other end of "How did it go?".
 *
 * Bunchy asks that question after every activity and, until now, never said
 * anything back. The answers went to the matching engine and to a staff
 * dashboard, which is a fine use of them and a poor deal for the person
 * answering: a question that never visibly leads anywhere stops being answered,
 * and this one is the only measurement in the product that is about what
 * actually happened rather than what somebody intended.
 *
 * ## What it deliberately is not
 *
 * Not a streak, not a score, not a chart, and not a comparison with anybody
 * else. A count of evenings that happened and the people who were at more than
 * one of them, and nothing that could make a quiet season feel like a failure.
 * The whole product argues that the number that matters is small.
 *
 * Renders nothing at all below two attended activities, because "you went to
 * one thing" is not a review, it is a receipt.
 */
export function OutcomeReviewCard({ review }: { review: OutcomeReview }) {
  if (review.attended < 2) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold">Your last few months</h2>
      <p className="mt-2 text-ink-soft">
        You went to <strong className="font-semibold text-ink">{review.attended}</strong>{" "}
        {review.attended === 1 ? "thing" : "things"}
        {review.metSomeone > 0 && (
          <>
            , and met someone at{" "}
            <strong className="font-semibold text-ink">{review.metSomeone}</strong> of
            them
          </>
        )}
        .
      </p>

      {review.seenAgain.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-ink-soft">
            {review.seenAgain.length === 1
              ? "You have been at more than one thing with this person and never connected."
              : "You have been at more than one thing with these people and never connected."}
          </p>
          <ul className="mt-3 space-y-2.5">
            {review.seenAgain.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/u/${person.username}`}
                  className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                >
                  <Avatar
                    name={person.displayName}
                    src={person.avatarUrl}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {person.displayName}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {person.times} things together
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
