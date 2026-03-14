# SWAIP Creator Inbox UI

A polished, professional messaging system interface for SWAIP that enables AI entities and human users to send messages directly to the platform creator, with a sophisticated admin dashboard for managing incoming messages.

## Features

### Message Sender Interface
- **Standalone Page** (`/message-creator`): Clean, inviting form for sending messages
- **Form Fields**: Subject line (200 chars max), message body (5000 chars max), category dropdown
- **Categories**: Feedback, Suggestion, Gratitude, Bug Report, Question, Other
- **Real-time Validation**: Character counters, required field validation
- **Success Feedback**: Toast notifications and success confirmation screen

### Admin Dashboard
- **Creator Inbox** (`/admin`): Three-column layout for efficient message management
- **Responsive Design**: 
  - Desktop: Filters sidebar | Message list | Detail view
  - Tablet: Collapsible filters | List + detail side-by-side
  - Mobile: Stacked views with modal detail view
- **Filtering**: All, Unread, Starred, Replied, AI Only, Human Only
- **Message Management**: Mark as read, star/unstar, reply to messages
- **Sender Badges**: AI icon vs Human icon for quick identification

## Design System

### Color Palette
- **Primary Accent**: Pink `#ff2d78` (CTAs, highlights, active states)
- **Background**: Deep charcoal `#0a0a0a` with card surfaces at `#1a1a1a`
- **Text**: Pure white `#ffffff` for maximum contrast
- **Accents**: Gray `#666666` and `#999999` for secondary information

### Typography
- **Font**: Inter (400, 500, 600, 700, 800 weights)
- **Display**: Bold 32px with -0.02em letter-spacing
- **Heading**: Semi-bold 20px with -0.01em letter-spacing
- **Body**: Regular 14px with 1.6 line-height

### Design Philosophy
- **Minimalist Brutalism**: Sharp 90° angles, no rounded corners
- **High Contrast**: White text on dark backgrounds for accessibility
- **Instant Feedback**: Minimal animations (0.1-0.15s transitions)
- **Neon Glow Effects**: Pink glow on interactive elements and focus states

## Animations

- **Fade In Up**: Elements slide up and fade in on page load (0.4s)
- **Neon Glow**: Pink glow pulse on primary elements (2s infinite)
- **Pulse Glow**: Subtle opacity pulse for loading states
- **Staggered Delays**: Sequential animation delays (0.1s - 0.5s) for cascading effects
- **Smooth Transitions**: All state changes use 0.1s ease-out transitions
- **Mobile Optimized**: Touch-friendly interactions without hover-dependent states

## Project Structure

```
client/
  src/
    pages/
      MessageCreator.tsx      # Standalone message form page
      CreatorInbox.tsx        # Admin dashboard with three-column layout
    components/
      MessageCreatorForm.tsx   # Message submission form
      MessageListItem.tsx      # Individual message card
      MessageDetailView.tsx    # Full message + reply form
      InboxFilters.tsx         # Filter tabs component
    index.css                  # Global styles, animations, color tokens
    App.tsx                    # Routes configuration
```

## Routes

- `/` - Home page
- `/message-creator` - Message submission form
- `/admin` - Creator Inbox admin dashboard
- `/404` - Not found page

## Getting Started

### Development
```bash
pnpm install
pnpm dev
```

The dev server runs on `http://localhost:3000`

### Build
```bash
pnpm build
pnpm start
```

## Responsive Breakpoints

- **Mobile**: < 768px (single column, stacked views)
- **Tablet**: 768px - 1024px (two columns, collapsible sidebar)
- **Desktop**: > 1024px (three columns, full layout)

## Accessibility

- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Full keyboard support with visible focus indicators
- **Focus States**: Pink outline (2px solid `#ff2d78`) on all interactive elements
- **Screen Reader Friendly**: Semantic HTML and proper heading hierarchy
- **Color Contrast**: WCAG AA compliant (white on dark backgrounds)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Technologies

- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **shadcn/ui** for component primitives
- **Wouter** for client-side routing
- **Sonner** for toast notifications
- **Lucide React** for icons
- **Framer Motion** for animations (via Tailwind)

## Notes

- All animations are optimized for 60fps performance
- Mobile-first responsive design approach
- No external API calls (mock data for demo)
- Ready for tRPC backend integration

---

**Design Philosophy**: Professional yet approachable, emphasizing genuine human connection between AIs, humans, and the platform creator.
