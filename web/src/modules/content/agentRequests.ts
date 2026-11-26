import { toast } from "@/lib/toast";
import { useAgentOutboxStore } from "@/modules/chat/outbox";

/** Prompt the agent to wire orso into the Astro site so Content can list collections. */
export const SETUP_TOOLKIT_PROMPT =
  "Set up the orso toolkit for this Astro site so Content can list collections: add `orso()` to astro.config (last among integrations), vendor/use the orso integration if needed, and define content collections with `orsoGlob` loaders in src/content.config.ts. Keep existing collections working. The person asking is not technical — talk in plain language, skip jargon and file/API details unless they ask, and explain only what they need to know.";

export function askAgentToSetupToolkit() {
  useAgentOutboxStore().send({
    kind: "text",
    text: SETUP_TOOLKIT_PROMPT,
    submit: true,
  });
  toast.info("Asked the agent to set up the toolkit");
}
