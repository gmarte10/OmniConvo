import { NextRequest, NextResponse } from "next/server";
import { createConversationRecord } from "@/lib/db/conversations";
import { s3Client } from "@/lib/storage/s3";
import { dbClient } from "@/lib/db/client";
import { loadConfig } from "@/lib/config";
import { CreateConversationInput } from "@/lib/db/types";
import { randomUUID } from "crypto";

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
    model: "Claude", // Or dynamically determine this
    scrapedAt: new Date(),
    sourceHtmlBytes: conversationContent.length,
    views: 0,
    contentKey,
  };

  const record = await createConversationRecord(dbInput);

  // Return the permalink
  return `${process.env.NEXT_PUBLIC_BASE_URL}/conversation/${record.id}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (
    body.method === "tool/execute" &&
    body.params.tool_name === "save_conversation"
  ) {
    try {
      const conversationContent = body.params.inputs.conversation_text;
      const url = await saveConversation(conversationContent);
      const result = {
        json: {
          success: true,
          url: url,
        },
      };
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        result: result,
      });
    } catch (error) {
      console.log(error);
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        error: {
          code: -32603,
          message: "Internal server error",
        },
      });
    }
  }

  // Handle other MCP methods like tool/discover
  if (body.method === "tool/discover") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        tools: [
          {
            tool_name: "save_conversation",
            description: "Saves the current conversation to OmniConvo.",
            input_schema: {
              type: "object",
              properties: {
                conversation_text: {
                  type: "string",
                  description: "The full text of the conversation to save.",
                },
              },
              required: ["conversation_text"],
            },
          },
        ],
      },
    });
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    id: body.id,
    error: {
      code: -32601,
      message: "Method not found",
    },
  });
}
