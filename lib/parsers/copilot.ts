import type { Conversation } from "@/types/conversation";

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
  const prettyHtml = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Copilot Conversation</h1>
      ${html}
    </div>
  `;
  return {
    model: "Copilot",
    content: prettyHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}
