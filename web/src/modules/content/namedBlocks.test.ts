// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { canRoundTrip, markdownExtensions, resetMarkdownManager } from "./markdown";
import {
  clearNamedBlocks,
  listNamedBlocks,
  namedBlockHtml,
  parseNamedBlockHtml,
  registerNamedBlock,
  type NamedBlockDefinition,
} from "./namedBlocks";

const note: NamedBlockDefinition = {
  id: "note",
  label: "Note",
  icon: "i-hugeicons-note",
  props: [
    { key: "title", label: "Title", type: "text" },
    { key: "body", label: "Body", type: "textarea" },
  ],
};

afterEach(() => {
  clearNamedBlocks();
  resetMarkdownManager();
});

describe("namedBlocks registry", () => {
  it("registers definitions and lists them", () => {
    registerNamedBlock(note);
    expect(listNamedBlocks().map(b => b.id)).toEqual(["note"]);
  });

  it("serializes props to a stable data-orso-block wrapper", () => {
    registerNamedBlock(note);
    expect(namedBlockHtml("note", { title: "Hello", body: "World" })).toBe(
      '<aside data-orso-block="note" data-title="Hello" data-body="World"></aside>',
    );
  });

  it("parses a registered wrapper back into block id and props", () => {
    registerNamedBlock(note);
    const html = '<aside data-orso-block="note" data-title="Hello" data-body="World"></aside>';
    expect(parseNamedBlockHtml(html)).toEqual({ block: "note", props: { title: "Hello", body: "World" } });
  });

  it("rejects unregistered or malformed HTML", () => {
    registerNamedBlock(note);
    expect(parseNamedBlockHtml('<aside data-orso-block="cta" data-title="x"></aside>')).toBeNull();
    expect(parseNamedBlockHtml('<div class="box">Box</div>')).toBeNull();
  });

  it("escapes attribute values on write and unescapes on read", () => {
    registerNamedBlock(note);
    const html = namedBlockHtml("note", { title: 'Say "hi" & go', body: "a < b" });
    expect(html).toContain("Say &quot;hi&quot; &amp; go");
    expect(parseNamedBlockHtml(html)).toEqual({
      block: "note",
      props: { title: 'Say "hi" & go', body: "a < b" },
    });
  });
});

describe("namedBlocks markdown round-trip", () => {
  it("accepts a registered named block in canRoundTrip", () => {
    registerNamedBlock(note);
    const source = 'Intro\n\n<aside data-orso-block="note" data-title="Hello" data-body="World"></aside>\n';
    expect(canRoundTrip(source)).toBe(true);
  });

  it("still rejects arbitrary block HTML", () => {
    registerNamedBlock(note);
    expect(canRoundTrip('Hi\n\n<div class="box">Box</div>\n')).toBe(false);
  });

  it("parses and serializes a named block without loss", () => {
    registerNamedBlock(note);
    const md = new Editor({ extensions: markdownExtensions() }).markdown!;
    const source = '<aside data-orso-block="note" data-title="Hello" data-body="World"></aside>';
    const doc = md.parse(source);
    expect(doc.content?.[0]).toMatchObject({
      type: "namedBlock",
      attrs: { block: "note", props: { title: "Hello", body: "World" } },
    });
    expect(md.serialize(doc).trim()).toBe(source);
  });
});
