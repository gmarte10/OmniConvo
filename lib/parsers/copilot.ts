import type { Conversation } from '@/types/conversation';
import * as cheerio from 'cheerio';

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
  // Load the HTML into cheerio for server-side parsing.
  const $ = cheerio.load(html);

  const conversationPairs: ConversationPair[] = [];
  const messageItems = $('[data-content="user-message"], .group\\/ai-message-item');

  messageItems.each((i, el) => {
    const element = $(el);

    // Check if the current element is a user message (prompt).
    if (element.attr('data-content') === 'user-message') {
      const promptText = element.find('.font-ligatures-none').text().trim();
      
      const nextElement = messageItems.eq(i + 1);

      // Check if the next element is an AI message (output).
      if (nextElement.hasClass('group/ai-message-item')) {
        const outputText = nextElement.find('p > span').text().trim();
        conversationPairs.push({ prompt: promptText, output: outputText });
      }
    }
  });

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
    .join('');

  const prettyHtml = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Copilot Conversation</h1>
      ${formattedHtml}
    </div>
  `;

  return {
    model: 'Copilot',
    content: prettyHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}