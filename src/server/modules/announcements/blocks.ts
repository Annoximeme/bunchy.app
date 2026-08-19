/**
 * The shape of an announcement's body.
 *
 * A small tagged union rather than markdown or HTML. It is rendered to React
 * elements and never through `dangerouslySetInnerHTML`, so an announcement
 * cannot carry markup however the row was written, which matters more here
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

/**
 * Turning what the operator typed into blocks.
 *
 * Three of the four block kinds existed from the start and nothing could
 * produce them: the composer split on blank lines and emitted paragraphs, so a
 * notice with a list of what changed had to be written as prose. This is the
 * missing half.
 *
 * The prefixes look like markdown and are deliberately not markdown. Nothing
 * here parses emphasis, links or raw HTML, and the output is still the same
 * closed union rendered to React elements, so the guarantee that an
 * announcement cannot carry markup is unchanged. What a prefix buys is
 * structure, which is the one thing prose cannot express: a reader scanning
 * for whether a change affects them needs a list to look like a list.
 *
 *   ## Heading
 *   > Quoted, for the words of a policy being changed
 *   - A list item
 *   Anything else is a paragraph, and blank lines separate them.
 *
 * An unrecognised prefix is not an error. It becomes a paragraph containing
 * exactly the characters that were typed, because the failure mode of a strict
 * parser here is an operator losing a sentence out of a legal notice.
 */
export function parseBlocks(source: string): AnnouncementBlock[] {
  const blocks: AnnouncementBlock[] = [];
  // List items accumulate across consecutive lines, so `- a` then `- b` is one
  // list of two rather than two lists of one.
  let pendingList: string[] = [];
  // Paragraph lines accumulate too: a hard-wrapped paragraph is one block, and
  // the line breaks a person happened to type are not structure.
  let pendingParagraph: string[] = [];

  const flushList = () => {
    if (pendingList.length > 0) {
      blocks.push({ kind: "list", items: pendingList });
      pendingList = [];
    }
  };

  const flushParagraph = () => {
    if (pendingParagraph.length > 0) {
      blocks.push({ kind: "paragraph", text: pendingParagraph.join(" ") });
      pendingParagraph = [];
    }
  };

  const flush = () => {
    flushList();
    flushParagraph();
  };

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();

    if (line === "") {
      flush();
      continue;
    }

    // `line === "##"` as well as the prefix, because the line was trimmed
    // above: an operator who types the marker and no text yet leaves "## ",
    // which arrives here as "##" and would otherwise become a paragraph
    // containing two hash characters.
    if (line === "##" || line.startsWith("## ")) {
      flush();
      const text = line.slice(3).trim();
      if (text) blocks.push({ kind: "heading", text });
      continue;
    }

    if (line === ">" || line.startsWith("> ")) {
      flush();
      const text = line.slice(2).trim();
      if (text) blocks.push({ kind: "quote", text });
      continue;
    }

    if (line === "-" || line.startsWith("- ")) {
      // A list interrupts a paragraph but continues a list.
      flushParagraph();
      const item = line.slice(2).trim();
      if (item) pendingList.push(item);
      continue;
    }

    // A plain line ends a list and joins the paragraph being built.
    flushList();
    pendingParagraph.push(line);
  }

  flush();
  return blocks;
}

/**
 * Blocks back to the source that produced them.
 *
 * Needed because the composer can now load a published announcement in order
 * to correct it, and the round trip has to be lossless or editing a typo in
 * the first paragraph would quietly flatten every list below it.
 */
export function blocksToSource(blocks: AnnouncementBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return `## ${block.text}`;
        case "quote":
          return `> ${block.text}`;
        case "list":
          return block.items.map((item) => `- ${item}`).join("\n");
        case "paragraph":
          return block.text;
      }
    })
    .join("\n\n");
}

/**
 * The plain-text rendering, for the email part and for the feed.
 *
 * Kept next to the parser rather than in the template, because a new block
 * kind added to the union above needs exactly one place to be taught how to
 * flatten, and a `switch` here is what makes the compiler say so.
 */
export function blocksToText(blocks: AnnouncementBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return block.text.toUpperCase();
        case "quote":
          // The quotation mark carries what italics carry in the HTML part.
          return `"${block.text}"`;
        case "list":
          return block.items.map((item) => `  • ${item}`).join("\n");
        case "paragraph":
          return block.text;
      }
    })
    .join("\n\n");
}
