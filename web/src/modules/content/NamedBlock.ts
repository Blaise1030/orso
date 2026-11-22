import { mergeAttributes, Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import NamedBlockView from "./NamedBlockView.vue";
import { namedBlockHtml, parseNamedBlockHtml } from "./namedBlocks";

/**
 * TipTap atom for registry-backed HTML sections. Markdown uses marked's block
 * `html` tokens; only wrappers that `parseNamedBlockHtml` accepts become nodes.
 */
export const NamedBlock = Node.create({
  name: "namedBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      block: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-orso-block") ?? "",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-orso-block": attrs.block }),
      },
      props: {
        default: {},
        parseHTML: (el: HTMLElement) => {
          try {
            return JSON.parse(el.getAttribute("data-props") || "{}") as Record<string, string>;
          } catch {
            return {};
          }
        },
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-props": JSON.stringify(attrs.props ?? {}),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-named-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    // Safe editor wrapper only — never emit author HTML into the CMS origin.
    return ["div", mergeAttributes(HTMLAttributes, { "data-named-block": "" })];
  },

  markdownTokenName: "html",

  parseMarkdown(token, h) {
    if (!token.block) return [];
    const parsed = parseNamedBlockHtml(String(token.text ?? token.raw ?? ""));
    if (!parsed) return [];
    return h.createNode("namedBlock", { block: parsed.block, props: parsed.props });
  },

  renderMarkdown(node) {
    const block = String(node.attrs?.block ?? "");
    const props = (node.attrs?.props ?? {}) as Record<string, string>;
    return namedBlockHtml(block, props);
  },

  addNodeView() {
    return VueNodeViewRenderer(NamedBlockView);
  },
});
