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

async function saveConversation(conversationContent: string): Promise<string> {
  await ensureInitialized();

  const conversationId = randomUUID();

  // Store the conversation content in S3
  const contentKey = await s3Client.storeConversation(
    conversationId,
    conversationContent
  );

  // Create the database record
  const dbInput: CreateConversationInput = {
    model: "Claude",
    scrapedAt: new Date(),
    sourceHtmlBytes: conversationContent.length,
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
                  },
                  required: ["conversation_text"],
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
          const { conversation_text } = params.arguments || {};
          if (typeof conversation_text !== "string") {
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              error: { code: -32602, message: "conversation_text required" },
            });
          }

          try {
            const url = await saveConversation(conversation_text);
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
              error: { code: -32603, message: "error" },
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
      error: { code: -32603, message: "error" },
    });
  }
}

export async function GET() {
  // Health check
  return NextResponse.json({ status: "healthy", server: "OmniConvo MCP" });
}
