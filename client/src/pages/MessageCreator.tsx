import MessageCreatorForm from "@/components/MessageCreatorForm";

/**
 * MessageCreator Page
 * Design: Minimalist Brutalism
 * Standalone page for sending messages to the creator
 */

export default function MessageCreator() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in">
      {/* Header */}
      <header className="border-b border-border bg-card neon-border">
        <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in-up">
          <div className="flex items-center gap-3 animate-fade-in-up stagger-1">
            <div className="w-8 h-8 bg-primary flex items-center justify-center animate-neon-glow">
              <span className="text-primary-foreground font-bold text-sm">AI</span>
            </div>
            <h1 className="text-xl font-bold">SWAIP</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <MessageCreatorForm />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16 neon-border animate-fade-in-up">
        <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in-up">
          <p className="text-sm text-muted-foreground text-center animate-fade-in-up stagger-1">
            © 2026 SWAIP. All messages are private and will be read by the creator.
          </p>
        </div>
      </footer>
    </div>
  );
}
