# Design Guidelines: ChatGPT-Style AI Chatbot Interface

## Design Approach Documentation
**Selected Approach:** Reference-Based Design inspired by ChatGPT, Claude, and modern conversational AI interfaces
**Justification:** Chat applications are experience-focused where user engagement and intuitive interaction patterns are paramount. Users expect familiar conversational UI patterns.

## Core Design Elements

### A. Color Palette
**Dark Mode (Primary):**
- Background: 212 100% 4% (deep charcoal)
- Surface: 210 11% 15% (elevated panels)
- Primary: 220 100% 60% (bright blue for send button)
- Text Primary: 0 0% 95% (near white)
- Text Secondary: 0 0% 70% (muted gray)
- Border: 215 15% 25% (subtle borders)

**Light Mode:**
- Background: 0 0% 98% (warm white)
- Surface: 0 0% 100% (pure white for chat bubbles)
- Primary: 220 100% 50% (professional blue)
- Text Primary: 0 0% 12% (dark gray)
- Text Secondary: 0 0% 45% (medium gray)
- Border: 0 0% 85% (light gray borders)

### B. Typography
- **Primary Font:** Inter via Google Fonts (clean, readable)
- **Monospace:** JetBrains Mono for code blocks
- **Sizes:** text-sm for UI elements, text-base for messages, text-lg for titles
- **Weights:** font-normal for body text, font-medium for usernames, font-semibold for headings

### C. Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, and 8 (p-4, gap-6, m-8, etc.)
- Consistent 4-unit spacing between messages
- 6-unit padding for main containers
- 2-unit spacing for tight UI elements

### D. Component Library

**Core Chat Components:**
- **Message Bubbles:** Rounded corners (rounded-2xl), distinct styling for user vs AI messages
- **Input Area:** Fixed bottom positioning with rounded input field and send button
- **Conversation List:** Sidebar with conversation history (collapsible on mobile)
- **Header:** Clean top bar with app title and settings icon

**Message Types:**
- User messages: Right-aligned, primary color background
- AI messages: Left-aligned, surface color with subtle border
- Code blocks: Monospace font with syntax highlighting
- Loading states: Animated typing indicators

**Navigation:**
- Minimal sidebar for conversation history
- Hamburger menu for mobile
- Clear visual hierarchy with conversation titles

**Forms & Inputs:**
- Rounded input fields with focus states
- Send button with icon (paper plane or arrow)
- Auto-expanding textarea for longer messages

### E. Specific Chat Interface Patterns

**Message Layout:**
- Avatar indicators for AI (optional small icon)
- Timestamp display on hover
- Copy message functionality
- Maximum width constraints for readability

**Conversation Flow:**
- Smooth scrolling to new messages
- Auto-scroll to bottom on new responses
- Message grouping by timestamp
- Clear conversation boundaries

**Responsive Behavior:**
- Mobile-first design with collapsible sidebar
- Touch-friendly button sizes (minimum 44px)
- Optimized message bubble sizing for mobile

**Loading & States:**
- Typing indicators with animated dots
- Message delivery states
- Error handling with retry options
- Empty state with welcoming message

This design creates a familiar, professional chat experience that users will immediately understand while maintaining modern aesthetics and excellent usability across all devices.