import type { Conversation } from "@/types/conversation";
import { parse, HTMLElement } from "node-html-parser";

interface ConversationTurn {
  prompt: string;
  output: string;
}

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
  const root = parse(html);
  const turns: ConversationTurn[] = [];

  const conversationElements = root.querySelectorAll(
    '[data-content="user-message"], .group\\/ai-message-item'
  );

  let currentPrompt: string | null = null;

  conversationElements.forEach((el) => {
    if (el.getAttribute("data-content") === "user-message") {
      currentPrompt = el.innerText.trim();
    } else if (
      el.classList.contains("group/ai-message-item") &&
      currentPrompt
    ) {
      // Clone the element to safely modify it
      const messageClone = el.clone() as HTMLElement;

      // Find and remove the UI buttons container
      const reactions = messageClone.querySelector(
        '[data-testid="message-item-reactions"]'
      );
      if (reactions) {
        reactions.remove();
      }

      // Get the full inner HTML of the message content
      const output = messageClone.innerHTML.trim();
      turns.push({ prompt: currentPrompt, output });
      currentPrompt = null; // Reset prompt after pairing
    }
  });

  // Handle a prompt that might not have a corresponding output
  if (currentPrompt) {
    turns.push({ prompt: currentPrompt, output: "" });
  }

  let beautifulHtml = '<div style="font-family: sans-serif; padding: 20px;">';
  beautifulHtml +=
    '<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Copilot Conversation</h1>';

  turns.forEach((turn) => {
    beautifulHtml += `<div style="margin-bottom: 20px;">`;
    beautifulHtml += `<h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Prompt:</h2>`;
    beautifulHtml += `<p style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">${turn.prompt}</p>`;
    if (turn.output) {
      beautifulHtml += `<h2 style="font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">Output:</h2>`;
      // Embed the full HTML content of the output
      beautifulHtml += `<div style="background-color: #e0e0e0; padding: 10px; border-radius: 5px;">${turn.output}</div>`;
    }
    beautifulHtml += `</div>`;
  });

  beautifulHtml += "</div>";

  return {
    model: "Copilot",
    content: beautifulHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}
