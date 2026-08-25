import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectThread, type DirectMessage } from "@/components/direct-thread";

/**
 * What a conversation tells the person who sent the last message.
 *
 * The read mark has been in the database since messaging shipped, keeping the
 * unread badge honest. None of it was ever shown to the sender, which is the
 * one place in a conversation where "did that land?" is actually asked.
 */

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  api,
  errorMessage: (e: unknown) => (e as Error).message,
}));

// jsdom implements neither of these. `EventSource` being absent exercises the
// same path a corporate proxy that strips `text/event-stream` puts real
// members on, which is worth testing rather than mocking away. `scrollTo` is
// simply missing from jsdom's element API and has nothing to do with the
// behaviour under test.
Element.prototype.scrollTo = () => {};

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({ conversation: { messages: [], otherLastReadAt: null } });
});

const mine: DirectMessage = {
  id: "m1",
  body: "Thursday works for me.",
  createdAt: "2026-08-20T10:00:00.000Z",
  fromViewer: true,
  deleted: false,
};

const theirs: DirectMessage = {
  id: "m2",
  body: "See you then.",
  createdAt: "2026-08-20T10:05:00.000Z",
  fromViewer: false,
  deleted: false,
};

function thread(props: Partial<Parameters<typeof DirectThread>[0]> = {}) {
  return render(
    <DirectThread
      conversationId="c1"
      otherName="Sam"
      initialMessages={[mine]}
      readOnly={false}
      initialOtherLastReadAt={null}
      {...props}
    />,
  );
}

describe("read receipts", () => {
  it("says sent while the other person has not caught up", () => {
    thread();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.queryByText("Seen")).not.toBeInTheDocument();
  });

  it("says seen once their read mark passes the message", () => {
    thread({ initialOtherLastReadAt: "2026-08-20T10:01:00.000Z" });
    expect(screen.getByText("Seen")).toBeInTheDocument();
  });

  it("still says sent when their read mark is older than the message", () => {
    thread({ initialOtherLastReadAt: "2026-08-19T23:00:00.000Z" });
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("marks nothing when the last word was theirs", () => {
    // A receipt on their message would be claiming to know whether *they* read
    // what they wrote, which is not a thing anybody wants to know.
    thread({
      initialMessages: [mine, theirs],
      initialOtherLastReadAt: "2026-08-20T11:00:00.000Z",
    });
    expect(screen.queryByText("Seen")).not.toBeInTheDocument();
    expect(screen.queryByText("Sent")).not.toBeInTheDocument();
  });

  it("puts the receipt on the newest message only", () => {
    thread({
      initialMessages: [
        mine,
        { ...mine, id: "m3", createdAt: "2026-08-20T10:10:00.000Z" },
      ],
      initialOtherLastReadAt: "2026-08-20T11:00:00.000Z",
    });
    expect(screen.getAllByText("Seen")).toHaveLength(1);
  });
});
