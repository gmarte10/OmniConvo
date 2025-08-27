import type { Conversation } from "@/types/conversation";
import { parse } from "node-html-parser";

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
  const root = parse(html);

  const prompts: string[] = root
    .querySelectorAll('[data-content="user-message"]')
    .map((el) => el.innerText.trim());
  const outputs: string[] = root
    .querySelectorAll(".group/ai-message-item")
    .map((el) => el.querySelector("p")?.innerText.trim() ?? "");

  let beautifulHtml = '<div style="font-family: sans-serif; padding: 20px;">';
  beautifulHtml +=
    '<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Copilot Conversation</h1>';

  prompts.forEach((prompt, index) => {
    beautifulHtml += `<div style="margin-bottom: 20px;">`;
    beautifulHtml += `<h2 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Prompt:</h2>`;
    beautifulHtml += `<p style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">${prompt}</p>`;
    if (outputs[index]) {
      beautifulHtml += `<h2 style="font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">Output:</h2>`;
      beautifulHtml += `<div style="background-color: #e0e0e0; padding: 10px; border-radius: 5px;">${outputs[index]}</div>`;
    }
    beautifulHtml += `</div>`;
  });

  beautifulHtml += "</div>";
  console.log(beautifulHtml);

  return {
    model: "Copilot",
    content: beautifulHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}
