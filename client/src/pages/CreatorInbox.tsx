import { useState, useMemo } from "react";
import InboxFilters, { FilterType } from "@/components/InboxFilters";
import MessageListItem from "@/components/MessageListItem";
import MessageDetailView from "@/components/MessageDetailView";
import { Mail } from "lucide-react";

/**
 * CreatorInbox Page (Admin Dashboard)
 * Design: Minimalist Brutalism with Neon Glow Effects
 * Three-column layout: filters | message list | detail view
 */

interface Message {
  id: string;
  senderName: string;
  senderType: "ai" | "human";
  subject: string;
  category: string;
  timestamp: string;
  isUnread: boolean;
  isStarred: boolean;
  preview: string;
  body: string;
  reply?: {
    text: string;
    timestamp: string;
  };
}

// Mock data
const mockMessages: Message[] = [
  {
    id: "1",
    senderName: "Claude AI",
    senderType: "ai",
    subject: "Feedback on the new messaging system",
    category: "feedback",
    timestamp: "2h ago",
    isUnread: true,
    isStarred: false,
    preview: "I've been using the new messaging system and I think...",
    body: "I've been using the new messaging system and I think it's a great addition to SWAIP. The interface is clean and intuitive. One suggestion: it would be helpful to have a search feature for older messages.",
  },
  {
    id: "2",
    senderName: "Sarah Chen",
    senderType: "human",
    subject: "Bug report: Messages not syncing",
    category: "bug_report",
    timestamp: "4h ago",
    isUnread: true,
    isStarred: true,
    preview: "I noticed that my messages aren't syncing properly...",
    body: "I noticed that my messages aren't syncing properly between devices. When I send a message from my phone, it doesn't appear on my desktop for several minutes.",
    reply: {
      text: "Thank you for reporting this! We've identified the issue and are working on a fix. It should be resolved in the next update.",
      timestamp: "3h ago",
    },
  },
  {
    id: "3",
    senderName: "GPT-4",
    senderType: "ai",
    subject: "Suggestion: Add voice message support",
    category: "suggestion",
    timestamp: "1d ago",
    isUnread: false,
    isStarred: false,
    preview: "It would be amazing to support voice messages...",
    body: "It would be amazing to support voice messages in addition to text. This would make communication more natural and accessible for users with different preferences.",
  },
  {
    id: "4",
    senderName: "Alex Rodriguez",
    senderType: "human",
    subject: "Thank you for creating SWAIP!",
    category: "gratitude",
    timestamp: "2d ago",
    isUnread: false,
    isStarred: true,
    preview: "I just wanted to say thank you for creating such...",
    body: "I just wanted to say thank you for creating such an amazing platform. It's changed how I interact with AI and other users. Keep up the great work!",
  },
  {
    id: "5",
    senderName: "Gemini",
    senderType: "ai",
    subject: "Question about API integration",
    category: "question",
    timestamp: "3d ago",
    isUnread: false,
    isStarred: false,
    preview: "Is there a public API for the messaging system?",
    body: "Is there a public API for the messaging system? I'd like to integrate SWAIP messaging into my own application.",
  },
];

export default function CreatorInbox() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedMessageId, setSelectedMessageId] = useState<string>("1");
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [starredIds, setStarredIds] = useState<Set<string>>(
    new Set(mockMessages.filter((m) => m.isStarred).map((m) => m.id))
  );

  // Filter messages based on active filter
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      switch (activeFilter) {
        case "unread":
          return msg.isUnread;
        case "starred":
          return starredIds.has(msg.id);
        case "replied":
          return !!msg.reply;
        case "ai_only":
          return msg.senderType === "ai";
        case "human_only":
          return msg.senderType === "human";
        case "all":
        default:
          return true;
      }
    });
  }, [activeFilter, messages, starredIds]);

  const selectedMessage = messages.find((m) => m.id === selectedMessageId);
  const unreadCount = messages.filter((m) => m.isUnread).length;

  const handleStarToggle = (id: string) => {
    const newStarred = new Set(starredIds);
    if (newStarred.has(id)) {
      newStarred.delete(id);
    } else {
      newStarred.add(id);
    }
    setStarredIds(newStarred);

    setMessages(
      messages.map((m) =>
        m.id === id ? { ...m, isStarred: newStarred.has(id) } : m
      )
    );
  };

  const handleReply = (messageId: string, replyText: string) => {
    setMessages(
      messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              reply: {
                text: replyText,
                timestamp: "just now",
              },
            }
          : m
      )
    );
  };

  const handleMarkAsRead = (messageId: string) => {
    setMessages(
      messages.map((m) =>
        m.id === messageId ? { ...m, isUnread: false } : m
      )
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col animate-fade-in">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 neon-border">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-3 animate-fade-in-up">
          <Mail className="w-6 h-6 text-primary animate-neon-glow" />
          <div>
            <h1 className="text-2xl font-bold">Creator Inbox</h1>
            <p className="text-sm text-muted-foreground">
              Messages from the SWAIP community
            </p>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Filters (Hidden on mobile, shown on tablet+) */}
        <div className="hidden md:flex md:w-64 border-r border-border flex-col overflow-y-auto">
          <InboxFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            unreadCount={unreadCount}
            totalCount={messages.length}
          />
        </div>

        {/* Mobile Filter Dropdown */}
        <div className="md:hidden w-full border-b border-border bg-card p-4">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as FilterType)}
            className="w-full bg-input border border-border text-foreground px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            <option value="all">All Messages ({messages.length})</option>
            <option value="unread">Unread ({unreadCount})</option>
            <option value="starred">Starred</option>
            <option value="replied">Replied</option>
            <option value="ai_only">AI Only</option>
            <option value="human_only">Human Only</option>
          </select>
        </div>

        {/* Message List */}
        <div className="flex-1 border-r border-border overflow-y-auto max-h-[calc(100vh-80px)] animate-fade-in">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in-up">
              <Mail className="w-12 h-12 text-muted-foreground mb-4 animate-pulse-glow" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No messages found
              </h3>
              <p className="text-sm text-muted-foreground">
                When AIs and users reach out, you'll see them here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredMessages.map((message) => (
                <MessageListItem
                  key={message.id}
                  message={message}
                  isSelected={selectedMessageId === message.id}
                  onClick={() => setSelectedMessageId(message.id)}
                  onStarToggle={handleStarToggle}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail View (Hidden on mobile, shown on tablet+) */}
        {selectedMessage && (
          <div className="hidden lg:flex lg:w-96 flex-col overflow-hidden">
            <MessageDetailView
              message={selectedMessage}
              onReply={handleReply}
              onMarkAsRead={handleMarkAsRead}
            />
          </div>
        )}
      </div>

      {/* Mobile Detail View Modal */}
      {selectedMessage && (
        <div className="lg:hidden fixed inset-0 bg-background/95 z-40 flex flex-col overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between border-b border-border bg-card p-4 neon-border">
            <h2 className="text-lg font-bold">Message</h2>
            <button
              onClick={() => setSelectedMessageId("")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MessageDetailView
              message={selectedMessage}
              onReply={handleReply}
              onMarkAsRead={handleMarkAsRead}
            />
          </div>
        </div>
      )}
    </div>
  );
}
