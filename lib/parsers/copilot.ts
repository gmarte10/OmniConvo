import type { Conversation } from "@/types/conversation";
import { parse } from "node-html-parser";

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
      const output = el.querySelector("p")?.innerHTML.trim() ?? "";
      turns.push({ prompt: currentPrompt, output });
      currentPrompt = null; // Reset prompt after pairing
    }
  });

  // Handle any remaining prompt without an output
  if (currentPrompt) {
    turns.push({ prompt: currentPrompt, output: "" });
  }

  let beautifulHtml =
    '<div style="font-family: sans-serif; padding: 20px; color: #333;">';
  beautifulHtml +=
    '<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #111;">Copilot Conversation</h1>';

  turns.forEach((turn) => {
    beautifulHtml += `<div style="margin-bottom: 20px; border-left: 3px solid #ccc; padding-left: 15px;">`;
    beautifulHtml += `<h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #555;">Prompt:</h2>`;
    beautifulHtml += `<p style="background-color: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #eee; white-space: pre-wrap;">${turn.prompt}</p>`;
    if (turn.output) {
      beautifulHtml += `<h2 style="font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #555;">Output:</h2>`;
      beautifulHtml += `<div style="background-color: #f0f8ff; padding: 10px; border-radius: 5px; border: 1px solid #e0efff; line-height: 1.6;">${turn.output}</div>`;
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
