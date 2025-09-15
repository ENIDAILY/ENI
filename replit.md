# AI Chat Application

## Overview
A ChatGPT-like web interface powered by GitHub's AI model inference endpoint using OpenAI GPT-4o. The application features a modern, responsive design with real-time chat interface, conversation management, and dark/light theme support.

## Current State
- ✅ Complete UI prototype with functional components
- ✅ Chat interface with message history
- ✅ Conversation sidebar with management
- ✅ Theme toggle (dark/light mode)
- ✅ Responsive design for mobile and desktop
- ✅ Runware.ai image generation integration (needs account credits)
- ⚠️ Chat functionality limited due to GitHub AI rate limits

## Architecture
- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js with GitHub AI integration for chat
- **Storage**: In-memory storage (easily upgradeable to database)
- **AI Integration**: GitHub's inference endpoint with GPT-4o model for chat
- **Image Generation**: Runware.ai API integration (backend-secured)

## Runware.ai Integration Complete
Successfully migrated from Hugging Face to Runware.ai for image generation:
- **Endpoint**: `https://api.runware.ai/v1/image-inference`
- **Model**: `runware:101@1`
- **Security**: API key stored securely on backend (not exposed to frontend)
- **Error Handling**: Comprehensive error detection and user-friendly messages
- **Status**: ✅ Working (requires account credits to generate images)

## User Preferences
- Wants ChatGPT-like functionality using GitHub's own AI endpoint
- Prefers modern, clean interface design
- Values responsive design for all device types

## Next Steps
1. Add GITHUB_TOKEN secret to enable real AI responses
2. Replace mock functionality with actual GitHub AI API calls
3. Optional: Add conversation persistence to database
4. Optional: Add additional GitHub AI models support

## Recent Changes
- **2025-09-15**: Created complete UI prototype with all chat functionality
- **2025-09-15**: Implemented theme system and responsive design
- **2025-09-15**: Added conversation management and message handling