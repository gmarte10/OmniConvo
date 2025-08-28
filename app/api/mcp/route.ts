import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createConversationRecord } from "@/lib/db/conversations";
import { s3Client } from "@/lib/storage/s3";
import { dbClient } from "@/lib/db/client";
import { loadConfig } from "@/lib/config";
import { CreateConversationInput } from "@/lib/db/types";

let isInitialized = false;

async function ensureInitialized() {
  if (!isInitialized) {
    const config = loadConfig();
    await dbClient.initialize(config.database);
    s3Client.initialize(config.s3);
    isInitialized = true;
  }
}

// Helper function to parse simple conversation text into structured format

async function saveConversation(
  conversationContent: string,
  title?: string
): Promise<string> {
  await ensureInitialized();

  const conversationId = randomUUID();

  // Add title if provided
  let finalContent = conversationContent;
  if (title) {
    finalContent = `Title: ${title}\n\n${conversationContent}`;
  }

  // Store the conversation content in S3
  const contentKey = await s3Client.storeConversation(
    conversationId,
    finalContent
  );

  // Create the database record
  const dbInput: CreateConversationInput = {
    model: "Claude",
    scrapedAt: new Date(),
    sourceHtmlBytes: finalContent.length,
    views: 0,
    contentKey,
  };

  const record = await createConversationRecord(dbInput);

  return `${process.env.NEXT_PUBLIC_BASE_URL}/conversation/${record.id}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { method, params, id, jsonrpc } = body;

  try {
    // Notifications (no response)
    if (id === undefined && method) {
      console.log(`Notification: ${method}`);
      return new NextResponse(null, { status: 204 });
    }

    if (!jsonrpc || !method || id === undefined) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Invalid Request" },
      });
    }

    switch (method) {
      case "initialize":
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-06-18",
            capabilities: { tools: {} },
            serverInfo: { name: "OmniConvo MCP", version: "0.1.0" },
          },
        });

      case "tools/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            tools: [
              {
                name: "save_conversation",
                description: "Save a conversation into OmniConvo (S3 + DB).",
                inputSchema: {
                  type: "object",
                  properties: {
                    conversation_text: {
                      type: "string",
                      description: "Full text of the conversation",
                    },
                    conversation_history: {
                      type: "array",
                      description:
                        "Array of conversation messages with roles and content",
                      items: {
                        type: "object",
                        properties: {
                          role: {
                            type: "string",
                            enum: ["human", "assistant"],
                          },
                          content: {
                            type: "string",
                          },
                          timestamp: {
                            type: "string",
                          },
                        },
                        required: ["role", "content"],
                      },
                    },
                    title: {
                      type: "string",
                      description: "Optional title for the conversation",
                    },
                  },
                  // We now require conversation_history
                  required: ["conversation_history"],
                },
              },
            ],
          },
        });

      case "tools/call":
        if (!params || !params.name) {
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing tool name" },
          });
        }

        if (params.name === "save_conversation") {
          const { conversation_history, title } = params.arguments || {};

          if (!conversation_history) {
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32602,
                message: "conversation_history is required",
              },
            });
          }

          try {
            let formattedContent = "";

            if (conversation_history && Array.isArray(conversation_history)) {
              // Use provided structured conversation history
              formattedContent = conversation_history
                .map((msg) => {
                  const roleLabel =
                    msg.role === "human" ? "### Human" : "### Assistant";
                  const timestamp = msg.timestamp
                    ? `*Timestamp: ${new Date(
                        msg.timestamp
                      ).toLocaleString()}*\n\n`
                    : "";
                  return `${roleLabel}\n${timestamp}${msg.content}`;
                })
                .join("\n\n---\n\n");
            }

            const url = await saveConversation(formattedContent, title);
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: `Conversation saved: ${url}` }],
              },
            });
          } catch (err) {
            console.error("Error saving conversation:", err);
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              error: { code: -32603, message: "Internal server error" },
            });
          }
        }

        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${params.name}` },
        });

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown method: ${method}` },
        });
    }
  } catch (error) {
    console.error("MCP route error:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32603, message: "Internal server error" },
    });
  }
}

export async function GET() {
  // Health check
  return NextResponse.json({ status: "healthy", server: "OmniConvo MCP" });
}
