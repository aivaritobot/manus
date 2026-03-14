import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, CheckCircle, Bot, User } from "lucide-react";

/**
 * MessageDetailView Component
 * Design: Minimalist Brutalism - Sharp edges, high contrast
 * Shows full message and reply form
 */

interface Message {
  id: string;
  senderName: string;
  senderType: "ai" | "human";
  subject: string;
  category: string;
  timestamp: string;
  isUnread: boolean;
  body: string;
  reply?: {
    text: string;
    timestamp: string;
  };
}

interface MessageDetailViewProps {
  message: Message;
  onReply?: (messageId: string, replyText: string) => void;
  onMarkAsRead?: (messageId: string) => void;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  feedback: { bg: "#2a2a2a", text: "#ffffff" },
  suggestion: { bg: "#2a2a2a", text: "#ffffff" },
  gratitude: { bg: "#2a2a2a", text: "#ffffff" },
  bug_report: { bg: "#ff2d78", text: "#ffffff" },
  question: { bg: "#2a2a2a", text: "#ffffff" },
  other: { bg: "#2a2a2a", text: "#ffffff" },
};

export default function MessageDetailView({
  message,
  onReply,
  onMarkAsRead,
}: MessageDetailViewProps) {
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReplied, setHasReplied] = useState(!!message.reply);

  const categoryStyle = categoryColors[message.category] || categoryColors.other;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      onReply?.(message.id, replyText);
      setReplyText("");
      setHasReplied(true);

      toast.success("Reply sent successfully");
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsRead = () => {
    if (message.isUnread) {
      onMarkAsRead?.(message.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border animate-fade-in">
      {/* Header */}
      <div className="border-b border-border bg-card p-6 neon-border">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            {message.senderType === "ai" ? (
              <Bot className="w-6 h-6 text-primary flex-shrink-0 mt-1 animate-neon-glow" />
            ) : (
              <User className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-1" />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground mb-1">{message.subject}</h2>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-foreground">{message.senderName}</span>
                <span className="text-xs text-muted-foreground">
                  {message.senderType === "ai" ? "AI Entity" : "Human User"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-1 font-medium"
                  style={{
                    backgroundColor: categoryStyle.bg,
                    color: categoryStyle.text,
                  }}
                >
                  {message.category.charAt(0).toUpperCase() + message.category.slice(1).replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">{message.timestamp}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {message.isUnread && (
            <Button
              onClick={handleMarkAsRead}
              variant="outline"
              className="text-sm px-4 py-2 border border-border text-foreground hover:bg-secondary"
            >
              Mark as Read
            </Button>
          )}
        </div>
      </div>

      {/* Message Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-invert max-w-none">
          <p className="text-foreground whitespace-pre-wrap leading-relaxed">{message.body}</p>
        </div>

        {/* Existing Reply */}
        {message.reply && (
          <div className="mt-8 pt-8 border-t border-border animate-fade-in-up">
            <div className="bg-secondary p-6 border border-border neon-border">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-primary animate-neon-glow" />
                <span className="text-sm font-semibold text-foreground">Replied by Admin</span>
                <span className="text-xs text-muted-foreground">{message.reply.timestamp}</span>
              </div>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">{message.reply.text}</p>
            </div>
          </div>
        )}
      </div>

      {/* Reply Form */}
      {!hasReplied && (
        <div className="border-t border-border bg-card p-6 animate-fade-in-up">
          <form onSubmit={handleReply} className="space-y-4">
            <div>
              <label htmlFor="reply" className="block text-sm font-semibold text-foreground mb-2">
                Your Reply
              </label>
              <textarea
                id="reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                rows={4}
                className="w-full bg-input border border-border text-foreground px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none neon-border-hover"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isSubmitting || !replyText.trim()}
                className="bg-primary text-primary-foreground px-6 py-2 font-semibold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all neon-border-hover"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin animate-pulse-glow" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Reply
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
