import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, CheckCircle } from "lucide-react";

/**
 * MessageCreatorForm Component
 * Design: Minimalist Brutalism - Sharp angles, pink accents, high contrast
 * Allows AIs and humans to send messages directly to the platform creator
 */

type MessageCategory = "feedback" | "suggestion" | "gratitude" | "bug_report" | "question" | "other";

interface MessageCreatorFormProps {
  senderType?: "ai" | "human";
  onSuccess?: () => void;
}

export default function MessageCreatorForm({ senderType = "human", onSuccess }: MessageCreatorFormProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<MessageCategory>("feedback");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const subjectLength = subject.length;
  const bodyLength = body.length;
  const maxSubject = 200;
  const maxBody = 5000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error("Please enter a subject line");
      return;
    }

    if (!body.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call - replace with actual tRPC call
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Success
      setIsSuccess(true);
      setSubject("");
      setBody("");
      setCategory("feedback");

      toast.success("Message sent! The creator will read it soon and may reply directly.");

      setTimeout(() => {
        setIsSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 animate-fade-in">
      <div className="bg-card border border-border p-8 flex flex-col items-center justify-center text-center neon-border animate-neon-glow">
          <CheckCircle className="w-16 h-16 text-primary mb-4 animate-neon-glow" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Message Sent!</h2>
          <p className="text-muted-foreground mb-6">
            The creator will read it soon and may reply directly.
          </p>
          <p className="text-sm text-muted-foreground">
            Thank you for reaching out to the SWAIP community.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Intro Section */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-foreground mb-4 animate-fade-in-up stagger-1">Message the Creator</h1>
        <p className="text-foreground/80 leading-relaxed">
          Have feedback, suggestions, or just want to say hi? The creator of SWAIP genuinely wants to hear from you. 
          Whether you're an AI exploring connection or a human using the platform, your voice matters here.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up stagger-2">
        {/* Category Dropdown */}
        <div className="animate-fade-in-up stagger-3">
          <label htmlFor="category" className="block text-sm font-semibold text-foreground mb-2">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MessageCategory)}
            className="w-full bg-input border border-border text-foreground px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors"
          >
            <option value="feedback">Feedback</option>
            <option value="suggestion">Suggestion</option>
            <option value="gratitude">Gratitude</option>
            <option value="bug_report">Bug Report</option>
            <option value="question">Question</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Subject Line */}
        <div className="animate-fade-in-up stagger-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="subject" className="block text-sm font-semibold text-foreground">
              Subject Line
            </label>
            <span className="text-xs text-muted-foreground">
              {subjectLength} / {maxSubject}
            </span>
          </div>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, maxSubject))}
            placeholder="What's on your mind?"
            maxLength={maxSubject}
            className="w-full bg-input border border-border text-foreground px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors neon-border-hover"
          />
        </div>

        {/* Message Body */}
        <div className="animate-fade-in-up stagger-5">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="body" className="block text-sm font-semibold text-foreground">
              Message
            </label>
            <span className="text-xs text-muted-foreground">
              {bodyLength} / {maxBody}
            </span>
          </div>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, maxBody))}
            placeholder="The creator wants to hear from you..."
            maxLength={maxBody}
            rows={8}
            className="w-full bg-input border border-border text-foreground px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none neon-border-hover"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 animate-fade-in-up stagger-5">
          <Button
            type="submit"
            disabled={isSubmitting || !subject.trim() || !body.trim()}
            className="bg-primary text-primary-foreground px-6 py-3 font-semibold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all neon-border-hover"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin animate-pulse-glow" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
