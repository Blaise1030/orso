/**
 * Extensible named HTML blocks for the rich Markdown editor.
 *
 * Register a definition (`id`, prop schema, label) and the editor stores it as a
 * `namedBlock` atom. Markdown round-trips through a stable
 * `<aside data-orso-block="…">` wrapper; unknown HTML still fails `canRoundTrip`.
 */

export type NamedBlockPropType = "text" | "textarea" | "url";

export interface NamedBlockProp {
  key: string;
  label: string;
  type: NamedBlockPropType;
  required?: boolean;
}

export interface NamedBlockDefinition {
  id: string;
  label: string;
  icon?: string;
  props: NamedBlockProp[];
}

export type NamedBlockAttrs = { block: string; props: Record<string, string> };

const registry = new Map<string, NamedBlockDefinition>();

/** Drop every registered definition (tests). */
export function clearNamedBlocks(): void {
  registry.clear();
}

/** Register or replace a named block definition. */
export function registerNamedBlock(definition: NamedBlockDefinition): void {
  if (!definition.id) throw new Error("named block id is required");
  registry.set(definition.id, definition);
}

export function getNamedBlock(id: string): NamedBlockDefinition | undefined {
  return registry.get(id);
}

export function listNamedBlocks(): NamedBlockDefinition[] {
  return [...registry.values()];
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Stable HTML written into Markdown for a registered block. */
export function namedBlockHtml(block: string, props: Record<string, string>): string {
  const def = registry.get(block);
  if (!def) return "";
  const attrs = [`data-orso-block="${escapeAttr(block)}"`];
  for (const prop of def.props) {
    attrs.push(`data-${kebab(prop.key)}="${escapeAttr(props[prop.key] ?? "")}"`);
  }
  return `<aside ${attrs.join(" ")}></aside>`;
}

/**
 * Parse a block-level HTML snippet into named-block attrs when it matches a
 * registered `data-orso-block` wrapper; otherwise null.
 */
export function parseNamedBlockHtml(html: string): NamedBlockAttrs | null {
  const trimmed = html.trim();
  if (!trimmed || typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  const el = doc.body.firstElementChild;
  if (!el || el !== doc.body.lastElementChild) return null;
  const id = el.getAttribute("data-orso-block");
  if (!id) return null;
  const def = registry.get(id);
  if (!def) return null;
  const props: Record<string, string> = {};
  for (const prop of def.props) {
    props[prop.key] = el.getAttribute(`data-${kebab(prop.key)}`) ?? "";
  }
  return { block: id, props };
}
