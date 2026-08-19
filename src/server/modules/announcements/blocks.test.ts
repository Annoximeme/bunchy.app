import { describe, expect, it } from "vitest";
import {
  type AnnouncementBlock,
  blocksToSource,
  blocksToText,
  parseBlocks,
} from "@/server/modules/announcements/blocks";

/**
 * The parser is the only thing standing between what an admin types and what
 * every member reads, so what it refuses to do matters as much as what it does.
 */
describe("parsing an announcement body", () => {
  it("joins hard-wrapped lines into one paragraph", () => {
    // The line breaks somebody happens to type are not structure, and treating
    // them as structure turns one sentence into four paragraphs.
    expect(parseBlocks("One sentence\nsplit over\nthree lines.")).toEqual([
      { kind: "paragraph", text: "One sentence split over three lines." },
    ]);
  });

  it("separates paragraphs on a blank line", () => {
    expect(parseBlocks("First.\n\nSecond.")).toEqual([
      { kind: "paragraph", text: "First." },
      { kind: "paragraph", text: "Second." },
    ]);
  });

  it("gathers consecutive items into one list", () => {
    expect(parseBlocks("- one\n- two\n- three")).toEqual([
      { kind: "list", items: ["one", "two", "three"] },
    ]);
  });

  it("reads headings and quotes", () => {
    expect(parseBlocks("## What changed\n\n> The old wording.")).toEqual([
      { kind: "heading", text: "What changed" },
      { kind: "quote", text: "The old wording." },
    ]);
  });

  it("ends a list when prose resumes", () => {
    expect(parseBlocks("- one\nAfterwards.")).toEqual([
      { kind: "list", items: ["one"] },
      { kind: "paragraph", text: "Afterwards." },
    ]);
  });

  it("never produces anything but the four block kinds", () => {
    // The guarantee the whole design rests on: whatever is typed, what comes
    // out is the closed union that gets rendered to React elements. There is no
    // input to this function that yields markup.
    const hostile = [
      "<script>alert(1)</script>",
      "<b>bold</b> and <a href='#'>a link</a>",
      "[link](https://elsewhere.example)",
      "**not bold**",
      "### deeper heading",
      ">no space after the marker",
      "-no space either",
    ].join("\n\n");

    const blocks = parseBlocks(hostile);
    const kinds = new Set(blocks.map((b) => b.kind));

    expect([...kinds]).toEqual(["paragraph"]);
    // The angle brackets survive as characters, which is the point: they are
    // text to be escaped by React on render, not markup to be interpreted.
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      text: "<script>alert(1)</script>",
    });
  });

  it("keeps an unrecognised prefix as typed rather than dropping it", () => {
    // The failure mode of a strict parser here is an operator silently losing a
    // sentence out of a legal notice.
    const blocks = parseBlocks("#### four hashes");
    expect(blocks).toEqual([{ kind: "paragraph", text: "#### four hashes" }]);
  });

  it("ignores a marker with nothing after it", () => {
    expect(parseBlocks("## \n\n- \n\nReal text.")).toEqual([
      { kind: "paragraph", text: "Real text." },
    ]);
  });
});

describe("round-tripping a body", () => {
  it("survives parse, render back to source, and parse again", () => {
    // Editing a published announcement loads it back through `blocksToSource`.
    // If that is lossy, correcting a typo in the first line quietly flattens
    // every list below it.
    const source = [
      "## What changed",
      "",
      "We now hold one fewer thing.",
      "",
      "- The first",
      "- The second",
      "",
      "> The wording being replaced.",
      "",
      "That is all.",
    ].join("\n");

    const once = parseBlocks(source);
    const twice = parseBlocks(blocksToSource(once));

    expect(twice).toEqual(once);
    expect(blocksToSource(once)).toBe(source);
  });
});

describe("flattening for the inbox", () => {
  it("renders every block kind as text", () => {
    const blocks: AnnouncementBlock[] = [
      { kind: "heading", text: "Heading" },
      { kind: "paragraph", text: "A paragraph." },
      { kind: "list", items: ["one", "two"] },
      { kind: "quote", text: "Quoted." },
    ];

    const text = blocksToText(blocks);

    expect(text).toContain("HEADING");
    expect(text).toContain("A paragraph.");
    expect(text).toContain("• one");
    expect(text).toContain('"Quoted."');
  });
});
