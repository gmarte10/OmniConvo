import type { Conversation } from "@/types/conversation";

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // This selector targets the main conversation container in the Copilot UI.
  // You may need to inspect the Copilot page and adjust this selector if the structure changes.
  const conversationContainer = doc.querySelector("cib-conversation-group");
  let conversationHtml = '';
  if (conversationContainer) {
    conversationHtml = conversationContainer.innerHTML;
  } else {
    // Fallback to the original implementation if the selector is not found
    conversationHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Copilot Conversation</h1>
        ${html}
      </div>
    `;
  }
  return {
    model: "Copilot",
    content: conversationHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}
