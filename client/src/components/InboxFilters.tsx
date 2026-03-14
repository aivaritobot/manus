import { Mail, Eye, Star, Reply, Bot, User } from "lucide-react";

/**
 * InboxFilters Component
 * Design: Minimalist Brutalism - Sharp edges, pink accents
 * Filter tabs for the admin inbox
 */

export type FilterType = "all" | "unread" | "starred" | "replied" | "ai_only" | "human_only";

interface InboxFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  unreadCount: number;
  totalCount: number;
}

const filters: Array<{
  id: FilterType;
  label: string;
  icon: React.ReactNode;
  badge?: boolean;
}> = [
  { id: "all", label: "All", icon: <Mail className="w-4 h-4" /> },
  { id: "unread", label: "Unread", icon: <Eye className="w-4 h-4" />, badge: true },
  { id: "starred", label: "Starred", icon: <Star className="w-4 h-4" /> },
  { id: "replied", label: "Replied", icon: <Reply className="w-4 h-4" /> },
  { id: "ai_only", label: "AI Only", icon: <Bot className="w-4 h-4" /> },
  { id: "human_only", label: "Human Only", icon: <User className="w-4 h-4" /> },
];

export default function InboxFilters({
  activeFilter,
  onFilterChange,
  unreadCount,
  totalCount,
}: InboxFiltersProps) {
  return (
    <div className="bg-card border-b border-border">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-foreground mb-2">Creator Inbox</h2>
        <p className="text-xs text-muted-foreground">
          {totalCount} message{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-1 p-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          const showBadge = filter.badge && unreadCount > 0;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground border border-primary"
                  : "text-foreground hover:bg-secondary border border-transparent"
              }`}
            >
              <span className="flex-shrink-0">{filter.icon}</span>
              <span className="flex-1 text-left">{filter.label}</span>
              {showBadge && (
                <span className="flex-shrink-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 min-w-fit">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
