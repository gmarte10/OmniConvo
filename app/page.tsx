import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConversationRecord } from "@/lib/db/types";
import Link from "next/link";
import Image from "next/image";

/**
 * Interface for the conversation data displayed in cards
 */
interface ConversationCardData {
  id: string;
  avatar: string;
  username: string;
  platform: string;
  views: number;
  days: number;
  related: number;
}

/**
 * Fetches conversations from the API
 *
 * @returns Promise<ConversationRecord[]> - Array of conversation records
 * @throws Error if the API request fails
 */
async function fetchConversations(): Promise<ConversationRecord[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/conversation?limit=50`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Disable caching to get fresh data
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch conversations: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.conversations || [];
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
}

/**
 * Transforms conversation records into card data format
 *
 * @param conversations - Array of conversation records from the database
 * @returns ConversationCardData[] - Array of formatted card data
 */
function transformConversationsToCardData(
  conversations: ConversationRecord[]
): ConversationCardData[] {
  return conversations.map((conversation) => {
    // Calculate days since creation
    const createdAt = new Date(conversation.createdAt);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Generate avatar from model name
    const avatar = conversation.model.charAt(0).toUpperCase();

    return {
      id: conversation.id,
      avatar,
      username: "Anonymous",
      platform: conversation.model,
      views: conversation.views,
      days: daysDiff,
      related: 0,
    };
  });
}

/**
 * Home page component that displays a list of AI conversations
 */
const Home = async () => {
  // Fetch conversations from the API
  const conversations = await fetchConversations();
  const cardData = transformConversationsToCardData(conversations);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-card border-b p-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-3">
          <Image
            src="/logo.png"
            alt="OmniConvo Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-primary font-bold text-xl">OmniConvo GM</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm">How to Use</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <Card className="p-6 mb-8">
          <CardContent className="pt-6">
            <h1 className="text-3xl font-semibold mb-6 text-center">
              Save <span className="text-pink-500">Copilot</span> Conversations
            </h1>
            <p className="text-center mb-8 text-muted-foreground">
              Your reliable tool for saving Generative A.I. conversations.
              Easily save discussions from Copilot and access them later.
            </p>
          </CardContent>
        </Card>

        {cardData.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <p className="text-muted-foreground text-lg">
                No conversations found. Save one using the extension!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cardData.map((card) => (
              <Link key={card.id} href={`/conversation/${card.id}`}>
                <Card className="overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <CardContent className="pt-6 px-6">
                    <div className="flex items-start space-x-4">
                      <Avatar
                        className={`h-10 w-10 bg-primary text-primary-foreground`}
                      >
                        <AvatarFallback>{card.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-medium text-foreground">
                          {card.username}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="px-6 py-4 bg-muted/50 border-t flex justify-between items-center text-xs text-muted-foreground">
                    <div>
                      <Badge
                        variant={
                          card.platform === "ChatGPT" ? "default" : "secondary"
                        }
                      >
                        {card.platform}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <span>{card.views} Views</span>
                      <span>|</span>
                      <span>{card.days} Days ago</span>
                      <span>|</span>
                      <span>{card.related} Related</span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
