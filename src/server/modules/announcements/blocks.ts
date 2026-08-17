/**
 * The shape of an announcement's body.
 *
 * A small tagged union rather than markdown or HTML. It is rendered to React
 * elements and never through `dangerouslySetInnerHTML`, so an announcement
 * cannot carry markup however the row was written — which matters more here
 * than almost anywhere, because these are the messages that arrive with the
 * operator's authority behind them.
 *
 * This lived in the Buzz module until Buzz was removed. It is here now because
 * announcements are the only thing that uses it, and a type whose owner has
 * been deleted is a type nobody maintains.
 */
export type AnnouncementBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] };
