# AI Chat Application - Netlify Deployment Guide

A ChatGPT-like web interface powered by GitHub's AI model inference endpoint using OpenAI GPT-4o. This application features a modern, responsive design with real-time chat interface, conversation management, and dark/light theme support.

## 🚀 Live Demo
⚡ **Deploy your own instance** - Follow the deployment instructions below to create your live demo

## ✨ Features

- **ChatGPT-like Interface**: Clean, modern chat UI with message bubbles and typing indicators
- **GitHub AI Integration**: Powered by GitHub's inference endpoint with GPT-4o model
- **Conversation Management**: Save and organize multiple conversations
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Responsive Design**: Optimized for desktop and mobile devices
- **Local Storage**: Conversations saved in browser (no database required)
- **Serverless Architecture**: Runs entirely on Netlify Functions

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Netlify Functions (Serverless)
- **AI API**: GitHub Inference Endpoint with OpenAI GPT-4o
- **Build Tool**: Vite
- **Deployment**: Netlify

## 📋 Prerequisites

Before deploying, you'll need:

1. **GitHub Personal Access Token**
   - Go to GitHub.com → Settings → Developer settings → Personal access tokens
   - Generate a new token (classic)
   - No special scopes are needed for the AI inference API
   - Copy the token for deployment

2. **Netlify Account**
   - Sign up at [netlify.com](https://netlify.com) (free tier available)

## 🚀 Deployment Instructions

### Method 1: Direct GitHub Integration (Recommended)

1. **Fork/Clone this repository** to your GitHub account

2. **Connect to Netlify**:
   - Log in to your Netlify dashboard
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub" and select your repository
   - Netlify will auto-detect the settings:
     - Build command: `vite build`
     - Publish directory: `client/dist`
     - Functions directory: `netlify/functions`

3. **Configure Environment Variables**:
   - In your site settings, go to "Environment variables"
   - Add the following variable:
     - **Key**: `GITHUB_TOKEN`
     - **Value**: Your GitHub personal access token

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will build and deploy your application
   - Your site will be available at `https://[site-name].netlify.app`

### Method 2: Manual CLI Deployment

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the project**:
   ```bash
   npm install
   npm run build
   ```

3. **Login and deploy**:
   ```bash
   netlify login
   netlify init
   netlify env:set GITHUB_TOKEN your_github_token_here
   netlify deploy --prod
   ```

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── lib/           # Utilities and configuration
├── netlify/
│   └── functions/         # Serverless functions
│       └── chat.js        # GitHub AI integration
├── netlify.toml           # Netlify configuration
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## ⚙️ Configuration Files

### netlify.toml
The `netlify.toml` file is pre-configured with:
- Build settings for Vite
- Function directory mapping
- SPA redirects for client-side routing
- API endpoint redirects to functions

### Environment Variables
Required environment variables:
- `GITHUB_TOKEN`: Your GitHub personal access token for AI API access

## 🔧 Local Development

To run the application locally for testing:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   Create a `.env` file in the root directory:
   ```
   GITHUB_TOKEN=your_github_token_here
   ```

3. **Run locally with Netlify Dev** (recommended):
   ```bash
   npx netlify dev
   ```
   This runs the Vite dev server with Netlify Functions emulation at the correct root directory.

## 🌐 How It Works

### Frontend (React + Vite)
- **Chat Interface**: Modern UI built with Shadcn/ui components
- **State Management**: React hooks for conversation and message state
- **Local Storage**: Conversations persisted in browser localStorage
- **Theme System**: Dark/light mode with system preference detection

### Backend (Netlify Functions)
- **Serverless API**: `/netlify/functions/chat.js` handles AI requests
- **GitHub Integration**: Uses OpenAI SDK configured for GitHub's endpoint
- **Stateless Design**: No server-side storage required
- **CORS Enabled**: Proper headers for frontend integration

### Data Flow
1. User sends message through chat interface
2. Frontend stores message in localStorage and calls Netlify function
3. Function calls GitHub AI inference endpoint with conversation context
4. AI response is returned and displayed in chat
5. Conversation is updated in localStorage

## 🔒 Security Considerations

- **GitHub Token**: Stored as environment variable, never exposed to frontend
- **Serverless Functions**: Run in isolated environment with automatic scaling
- **No Database**: All data stored locally in browser, nothing on servers
- **HTTPS**: All communication encrypted via Netlify's CDN

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to get response from AI" error**:
   - Check that `GITHUB_TOKEN` environment variable is set correctly
   - Ensure your GitHub token has not expired
   - Verify the token has access to GitHub AI inference endpoint

2. **Build fails with "Module not found" error**:
   - Run `npm install` to ensure all dependencies are installed
   - Check that Node.js version is 18 or higher

3. **Functions not working locally**:
   - Use `netlify dev` instead of `npm run dev` for local testing
   - Ensure Netlify CLI is installed globally

4. **Conversations not saving**:
   - This is expected behavior - conversations are stored locally in your browser
   - Clear browser data will reset conversations
   - Private/incognito mode won't persist data

### Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify environment variables in Netlify dashboard
3. Review the function logs in Netlify's dashboard
4. Ensure your GitHub token is valid and active

## 📈 Performance

- **Fast Load Times**: Static site deployment with global CDN
- **Scalable**: Serverless functions auto-scale with demand
- **Efficient**: Minimal API calls, local storage for conversations
- **Responsive**: Optimized for all device sizes

## 🎨 Customization

You can customize the application by:
- Modifying colors in `client/src/index.css`
- Adjusting the system prompt in `netlify/functions/chat.js`
- Adding new UI components in `client/src/components/`
- Extending the conversation features in the chat interface

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🚀 Quick Deploy Button

To deploy this application:
1. Fork this repository to your GitHub account
2. Use the deployment instructions above to connect it to Netlify
3. Your deployed app will be available at `https://[your-site-name].netlify.app`