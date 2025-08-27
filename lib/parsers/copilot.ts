import type { Conversation } from "@/types/conversation";

/**
 * A type to represent a single prompt-output pair.
 */
type ConversationPair = {
  prompt: string;
  output: string;
};

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
  // Use the DOMParser API to parse the HTML string into a DOM document.
  const parser = new DOMParser();
  const doc: Document = parser.parseFromString(html, "text/html");

  const conversationPairs: ConversationPair[] = [];
  const messageItems: NodeListOf<Element> = doc.querySelectorAll(
    '[data-content="user-message"], .group\\/ai-message-item'
  );

  for (let i = 0; i < messageItems.length; i++) {
    const item: Element = messageItems[i];

    // Check if the current item is a user message (prompt).
    if (item.getAttribute("data-content") === "user-message") {
      const promptElement = item.querySelector(
        ".font-ligatures-none"
      ) as HTMLElement | null;
      const promptText: string = promptElement
        ? promptElement.textContent?.trim() ?? ""
        : "";

      const outputItem: Element | null = messageItems[i + 1];

      // Check if the next element is an AI message (output).
      if (
        outputItem &&
        outputItem.classList.contains("group/ai-message-item")
      ) {
        const outputElement = outputItem.querySelector(
          "p > span"
        ) as HTMLSpanElement | null;
        const outputText: string = outputElement
          ? outputElement.textContent?.trim() ?? ""
          : "";

        conversationPairs.push({ prompt: promptText, output: outputText });
        i++; // Increment to skip the output item in the next iteration.
      }
    }
  }

  // Format the extracted pairs into a single HTML string.
  const formattedHtml: string = conversationPairs
    .map(
      (pair: ConversationPair) => `
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
