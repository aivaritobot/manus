import { Star, Bot, User } from "lucide-react";
import { useState } from "react";

/**
 * MessageListItem Component
 * Design: Minimalist Brutalism - Sharp edges, pink accents
 * Individual message card in the inbox list
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
}

interface MessageListItemProps {
  message: Message;
  isSelected: boolean;
  onClick: () => void;
  onStarToggle: (id: string) => void;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  feedback: { bg: "#2a2a2a", text: "#ffffff" },
  suggestion: { bg: "#2a2a2a", text: "#ffffff" },
  gratitude: { bg: "#2a2a2a", text: "#ffffff" },
  bug_report: { bg: "#ff2d78", text: "#ffffff" },
  question: { bg: "#2a2a2a", text: "#ffffff" },
  other: { bg: "#2a2a2a", text: "#ffffff" },
};

export default function MessageListItem({
  message,
  isSelected,
  onClick,
  onStarToggle,
}: MessageListItemProps) {
  const [isHovering, setIsHovering] = useState(false);

  const categoryStyle = categoryColors[message.category] || categoryColors.other;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`border-b border-border px-4 py-4 cursor-pointer transition-all animate-fade-in ${
        isSelected ? "bg-secondary neon-border" : isHovering ? "bg-secondary/50" : "bg-background"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Unread Indicator */}
        {message.isUnread && (
          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0 animate-pulse-glow" />
        )}
        {!message.isUnread && <div className="w-2 h-2 mt-2 flex-shrink-0" />}

        {/* Sender Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {message.senderType === "ai" ? (
              <Bot className="w-4 h-4 text-primary flex-shrink-0" />
            ) : (
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className={`text-sm font-semibold ${message.isUnread ? "text-foreground" : "text-muted-foreground"}`}>
              {message.senderName}
            </span>
            <span className="text-xs text-muted-foreground">
              {message.senderType === "ai" ? "AI" : "Human"}
            </span>
          </div>

          {/* Subject */}
          <p
            className={`text-sm mb-2 truncate ${
              message.isUnread ? "font-bold text-foreground" : "text-foreground/80"
            }`}
          >
            {message.subject}
          </p>

          {/* Category Badge and Timestamp */}
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

        {/* Star Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle(message.id);
          }}
          className="flex-shrink-0 p-2 hover:bg-secondary transition-colors hover:text-primary"
          aria-label={message.isStarred ? "Unstar message" : "Star message"}
        >
          <Star
            className={`w-4 h-4 transition-all ${message.isStarred ? "animate-neon-glow" : ""}`}
            fill={message.isStarred ? "#ff2d78" : "none"}
            color={message.isStarred ? "#ff2d78" : "#666666"}
          />
        </button>
      </div>
    </div>
  );
}
