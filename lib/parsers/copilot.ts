import type { Conversation } from "@/types/conversation";

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const conversationPairs = [];
  const messageItems = doc.querySelectorAll(
    '[data-content="user-message"], .group\\/ai-message-item'
  );

  for (let i = 0; i < messageItems.length; i++) {
    const item = messageItems[i];
    if (item.getAttribute("data-content") === "user-message") {
      const promptElement = item.querySelector(".font-ligatures-none");
      const promptText = promptElement ? promptElement.textContent.trim() : "";

      const outputItem = messageItems[i + 1];
      if (
        outputItem &&
        outputItem.classList.contains("group/ai-message-item")
      ) {
        const outputElement = outputItem.querySelector("p > span");
        const outputText = outputElement
          ? outputElement.textContent.trim()
          : "";
        conversationPairs.push({ prompt: promptText, output: outputText });
        i++;
      }
    }
  }

  // Format the extracted pairs into a single HTML string
  const formattedHtml = conversationPairs
    .map(
      (pair) => `
    <div style="margin-bottom: 20px;">
      <h3 style="font-weight: bold;">Prompt:</h3>
      <p>${pair.prompt}</p>
      <h3 style="font-weight: bold; margin-top: 10px;">Output:</h3>
      <p>${pair.output}</p>
    </div>
    `
    )
    .join("");

  const prettyHtml = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Copilot Conversation</h1>
      ${formattedHtml}
    </div>
  `;
  return {
    model: "Copilot",
    content: prettyHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}
