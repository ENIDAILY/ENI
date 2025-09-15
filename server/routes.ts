import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { chatRequestSchema, generateImageRequestSchema, generateTTSRequestSchema, generateVideoRequestSchema, type ChatResponse, type GenerateImageResponse, type GenerateTTSResponse, type GenerateVideoResponse, addApiKeySchema, updateApiKeyStatusSchema, deleteApiKeySchema, getApiKeysSchema } from "@shared/schema";
import { getChatCompletion } from "./services/githubAI";

// Simple admin password verification
function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";
  return password === adminPassword;
}

// Helper to get next API key using round-robin rotation
async function getNextApiKey(provider: string): Promise<{ key: string; keyId: string } | null> {
  const activeKeys = await storage.getActiveApiKeys(provider);
  
  if (activeKeys.length === 0) {
    return null;
  }
  
  // Use round-robin: pick the least recently used key
  const nextKey = activeKeys[0];
  const decryptedKey = (storage as any).getDecryptedApiKey(nextKey.id);
  
  if (!decryptedKey) {
    console.error(`Failed to decrypt API key ${nextKey.id}`);
    return null;
  }
  
  // Update usage
  await storage.incrementApiKeyUsage(nextKey.id);
  
  return {
    key: decryptedKey,
    keyId: nextKey.id
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve generated videos securely
  const videosPath = path.join(process.cwd(), 'public', 'videos');
  if (!fs.existsSync(videosPath)) {
    fs.mkdirSync(videosPath, { recursive: true });
  }
  
  // Use express.static for secure file serving
  app.use('/video', express.static(videosPath, {
    setHeaders: (res, path) => {
      if (path.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      }
    }
  }));

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationId } = chatRequestSchema.parse(req.body);
      
      let conversation;
      
      // Get or create conversation
      if (conversationId) {
        conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }
      } else {
        // Create new conversation with a title based on the first message
        const title = message.length > 50 ? message.substring(0, 47) + "..." : message;
        conversation = await storage.createConversation({ title });
      }

      // Get conversation history for context
      const history = await storage.getMessagesByConversation(conversation.id);
      
      // Save user message
      const userMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: message,
        isUser: true,
      });

      // Try to get API key from database first, fallback to env vars
      let apiKeyInfo = await getNextApiKey("github");
      let githubApiKey: string | undefined;
      
      if (apiKeyInfo) {
        githubApiKey = apiKeyInfo.key;
        console.log("Using GitHub API key from database:", { keyId: apiKeyInfo.keyId });
      } else {
        console.log("Using GitHub API key from environment variables");
      }

      // Get AI response with conversation context
      const aiResponse = await getChatCompletion(message, history, githubApiKey);
      
      // Save AI message
      const aiMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse,
        isUser: false,
      });

      // Update conversation timestamp
      await storage.updateConversation(conversation.id, { title: conversation.title });

      const response: ChatResponse = {
        response: aiResponse,
        conversationId: conversation.id,
        messageId: aiMessage.id,
      };

      res.json(response);
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: "Failed to process chat request" });
    }
  });

  // Get conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Get conversation messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await storage.getMessagesByConversation(id);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // =============================================================================
  // ADMIN API KEY MANAGEMENT ROUTES
  // =============================================================================

  // Get all API keys (admin only)
  app.post("/api/admin/keys", async (req, res) => {
    try {
      const { adminPassword } = getApiKeysSchema.parse(req.body);
      
      if (!verifyAdminPassword(adminPassword)) {
        return res.status(401).json({ error: "Invalid admin password" });
      }
      
      const apiKeys = await storage.getApiKeys();
      // Return keys without the actual key values for security
      const safeKeys = apiKeys.map(key => ({
        ...key,
        keyValue: `*****${key.keyValue.slice(-4)}` // Show only last 4 chars
      }));
      
      res.json(safeKeys);
    } catch (error) {
      console.error("Get API keys error:", error);
      res.status(500).json({ error: "Failed to get API keys" });
    }
  });

  // Add new API key (admin only)
  app.post("/api/admin/keys/add", async (req, res) => {
    try {
      const { name, provider, keyValue, adminPassword } = addApiKeySchema.parse(req.body);
      
      if (!verifyAdminPassword(adminPassword)) {
        return res.status(401).json({ error: "Invalid admin password" });
      }
      
      const newKey = await storage.createApiKey({
        name,
        provider,
        keyValue,
        isActive: true
      });
      
      // Return without the actual key value
      const safeKey = {
        ...newKey,
        keyValue: `*****${newKey.keyValue.slice(-4)}`
      };
      
      res.json(safeKey);
    } catch (error) {
      console.error("Add API key error:", error);
      res.status(500).json({ error: "Failed to add API key" });
    }
  });

  // Update API key status (admin only)
  app.post("/api/admin/keys/update", async (req, res) => {
    try {
      const { id, isActive, adminPassword } = updateApiKeyStatusSchema.parse(req.body);
      
      if (!verifyAdminPassword(adminPassword)) {
        return res.status(401).json({ error: "Invalid admin password" });
      }
      
      const updatedKey = await storage.updateApiKey(id, { isActive });
      
      if (!updatedKey) {
        return res.status(404).json({ error: "API key not found" });
      }
      
      // Return without the actual key value
      const safeKey = {
        ...updatedKey,
        keyValue: `*****${updatedKey.keyValue.slice(-4)}`
      };
      
      res.json(safeKey);
    } catch (error) {
      console.error("Update API key error:", error);
      res.status(500).json({ error: "Failed to update API key" });
    }
  });

  // Delete API key (admin only)
  app.post("/api/admin/keys/delete", async (req, res) => {
    try {
      const { id, adminPassword } = deleteApiKeySchema.parse(req.body);
      
      if (!verifyAdminPassword(adminPassword)) {
        return res.status(401).json({ error: "Invalid admin password" });
      }
      
      const deleted = await storage.deleteApiKey(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "API key not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete API key error:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // =============================================================================
  // IMPROVED IMAGE GENERATION WITH ROTATION
  // =============================================================================

  // Hugging Face Image Generation endpoint
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { text } = generateImageRequestSchema.parse(req.body);

      // Try to get API key from database first, fallback to env vars
      let apiKeyInfo = await getNextApiKey("huggingface");
      
      // Fallback to environment variables if no keys in database
      if (!apiKeyInfo) {
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
          console.error("No Hugging Face API token found in database or environment variables");
          return res.status(503).json({ 
            error: { 
              code: "NOT_CONFIGURED", 
              message: "Image generation service is not configured", 
              details: "Please add Hugging Face API token via the admin panel or environment variables" 
            } 
          });
        }

        apiKeyInfo = { key: hfToken, keyId: "env-fallback" };
      }

      const finalToken = apiKeyInfo.key;

      // Cap prompt size to prevent issues
      if (text.length > 1000) {
        return res.status(400).json({
          error: {
            code: "PROMPT_TOO_LONG",
            message: "Image prompt is too long",
            details: "Please use a shorter description (max 1000 characters)"
          }
        });
      }

      console.log("Image generation request:", { 
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        keyId: apiKeyInfo.keyId,
        provider: "huggingface",
        model: "black-forest-labs/flux-dev"
      });

      const requestBody = {
        prompt: text,
        model: "black-forest-labs/flux-dev",
        response_format: "b64_json"
      };

      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Faster timeout for HuggingFace

      const response = await fetch('https://router.huggingface.co/nebius/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${finalToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log("Hugging Face API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Hugging Face API error details:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });

        // Parse structured error responses
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        // Handle specific error cases
        if (response.status === 401) {
          return res.status(401).json({
            error: {
              code: "INVALID_API_KEY",
              message: "Invalid or expired Hugging Face API key",
              details: "Please check your HF_TOKEN configuration"
            }
          });
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          return res.status(429).json({
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests to Hugging Face API",
              retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
              details: "Please wait before trying again"
            }
          });
        }

        if (response.status === 402) {
          return res.status(402).json({
            error: {
              code: "OUT_OF_CREDITS",
              message: "Hugging Face account out of credits",
              details: "Please add credits to your Hugging Face account to continue generating images"
            }
          });
        }

        if (response.status === 400) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Invalid prompt or request parameters",
              details: errorData.error || "Please check your prompt and try again"
            }
          });
        }

        // Generic provider error
        return res.status(502).json({
          error: {
            code: "PROVIDER_ERROR",
            message: "Image generation service is temporarily unavailable",
            details: "Please try again later"
          }
        });
      }

      // Handle JSON response from Hugging Face API
      const data = await response.json();
      console.log("Hugging Face API response received");
      
      // Handle different response formats
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        const imageData = data.data[0];
        if (imageData.b64_json) {
          // Convert base64 to data URL
          const imageUrl = `data:image/png;base64,${imageData.b64_json}`;
          console.log("Hugging Face API success: received base64 image");
          res.json({ output_url: imageUrl });
        } else if (imageData.url) {
          // Direct URL response
          console.log("Hugging Face API success: received image URL");
          res.json({ output_url: imageData.url });
        } else {
          console.error("Unexpected Hugging Face API response format:", data);
          return res.status(502).json({
            error: {
              code: "INVALID_RESPONSE",
              message: "Invalid response from image generation service",
              details: "The service returned an unexpected response format"
            }
          });
        }
      } else if (data?.url) {
        // Direct URL in top-level response
        console.log("Hugging Face API success: received direct URL");
        res.json({ output_url: data.url });
      } else if (data?.b64_json) {
        // Direct base64 in top-level response
        const imageUrl = `data:image/png;base64,${data.b64_json}`;
        console.log("Hugging Face API success: received direct base64");
        res.json({ output_url: imageUrl });
      } else {
        console.error("Unexpected Hugging Face API response format:", data);
        return res.status(502).json({
          error: {
            code: "INVALID_RESPONSE",
            message: "Invalid response from image generation service",
            details: "The service returned an unexpected response format"
          }
        });
      }
    } catch (error) {
      console.error("Image generation error:", error);
      
      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        return res.status(504).json({
          error: {
            code: "TIMEOUT",
            message: "Image generation request timed out",
            details: "The service took too long to respond. Please try again with a simpler prompt"
          }
        });
      }

      // Generic server error
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during image generation",
          details: "Please try again later"
        }
      });
    }
  });

  // Murf.ai Text-to-Speech endpoint
  app.post("/api/generate-tts", async (req, res) => {
    try {
      const { text, voiceId } = generateTTSRequestSchema.parse(req.body);

      // Try to get API key from database first, fallback to env vars
      let apiKeyInfo = await getNextApiKey("murf");
      
      // Fallback to environment variables if no keys in database
      if (!apiKeyInfo) {
        const murfApiKey = process.env.MURF_API_KEY;

        if (!murfApiKey) {
          console.error("No Murf.ai API key found in database or environment variables");
          return res.status(503).json({
            error: {
              code: "NOT_CONFIGURED",
              message: "Text-to-speech service is not configured",
              details: "Please add Murf.ai API key via the admin panel or environment variables"
            }
          });
        }

        apiKeyInfo = { key: murfApiKey, keyId: "env-fallback" };
      }

      const finalApiKey = apiKeyInfo.key;

      // Cap text size to prevent issues
      if (text.length > 5000) {
        return res.status(400).json({
          error: {
            code: "TEXT_TOO_LONG",
            message: "Text is too long for speech generation",
            details: "Please use shorter text (max 5000 characters)"
          }
        });
      }

      console.log("TTS generation request:", {
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        voiceId,
        textLength: text.length,
        keyId: apiKeyInfo.keyId,
        provider: "murf"
      });

      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://api.murf.ai/v1/speech/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'api-key': finalApiKey
        },
        body: JSON.stringify({
          text: text,
          voiceId: voiceId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log("Murf.ai API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Murf.ai API error details:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });

        // Parse structured error responses
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        // Handle specific error cases
        if (response.status === 401) {
          return res.status(401).json({
            error: {
              code: "INVALID_API_KEY",
              message: "Invalid or expired Murf.ai API key",
              details: "Please check your Murf.ai API key configuration"
            }
          });
        }

        if (response.status === 403) {
          return res.status(403).json({
            error: {
              code: "INSUFFICIENT_PERMISSIONS",
              message: "Murf.ai API key lacks required permissions",
              details: "Please verify your API key permissions at https://murf.ai"
            }
          });
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          return res.status(429).json({
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests to Murf.ai API",
              retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
              details: "Please wait before trying again"
            }
          });
        }

        if (response.status === 400) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Invalid text or voice parameters",
              details: errorData.error?.message || "Please check your text and voice settings"
            }
          });
        }

        // Generic provider error
        return res.status(502).json({
          error: {
            code: "PROVIDER_ERROR",
            message: "Text-to-speech service is temporarily unavailable",
            details: "Please try again later"
          }
        });
      }

      // Parse JSON response from Murf.ai
      const audioData = await response.json();
      console.log("Murf.ai API success: received audio response");

      // Smart parsing to handle various response formats from Murf.ai
      const pick = (v?: any) => typeof v === 'string' ? v : undefined;
      const candidates = [
        pick(audioData?.audio_url),
        pick(audioData?.url), 
        pick(audioData?.audioUrl),
        pick(audioData?.fileUrl),
        pick(audioData?.link),
        pick(audioData?.audioFile),
        typeof audioData === 'string' ? audioData : undefined
      ].filter(Boolean) as string[];

      // First, try to find URLs that are already properly formatted
      let audioUrl = candidates.find(s => 
        s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')
      );

      // If no direct URL found, check if we have base64 data to wrap
      if (!audioUrl && candidates[0]) {
        const candidate = candidates[0];
        // Basic base64 detection (simplified pattern)
        const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(candidate) && candidate.length % 4 === 0;
        if (isBase64) {
          audioUrl = `data:audio/mpeg;base64,${candidate}`;
        }
      }

      if (!audioUrl) {
        console.error("Unexpected Murf.ai response format - no valid audio URL found");
        return res.status(502).json({
          error: {
            code: "PROVIDER_ERROR",
            message: "Invalid response from text-to-speech service",
            details: "Service returned unexpected data format"
          }
        });
      }

      const result: GenerateTTSResponse = { audio_url: audioUrl };
      res.json(result);
    } catch (error) {
      console.error("TTS generation error:", error);

      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        return res.status(504).json({
          error: {
            code: "TIMEOUT",
            message: "Text-to-speech request timed out",
            details: "The service took too long to respond. Please try again with shorter text"
          }
        });
      }

      // Generic server error
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during speech generation",
          details: "Please try again later"
        }
      });
    }
  });

  // Video generation endpoint with WebSocket progress
  app.post("/api/generate-video", async (req, res) => {
    try {
      const { imagePrompts, voiceId } = generateVideoRequestSchema.parse(req.body);

      console.log("Video generation request:", {
        imageCount: imagePrompts.length,
        voiceId: voiceId || "en-US-terrell",
        totalVoiceoverLength: imagePrompts.reduce((sum: number, p: any) => sum + p.voiceover.length, 0)
      });

      // Generate unique session ID for progress tracking
      const sessionId = randomUUID();
      console.log(`Starting video generation with session ID: ${sessionId}`);

      // Respond immediately with sessionId for real-time progress tracking
      res.json({
        sessionId: sessionId,
        message: "Video generation started. Monitor progress via WebSocket."
      });

      // Start video generation asynchronously (don't await here)
      (async () => {
        try {
          // Import video service dynamically to avoid module loading issues
          const { generateVideo } = await import('./services/videoService');
          
          // Define progress callback for WebSocket broadcasting
          const onProgress = (step: string, progress: number, message: string) => {
            if ((global as any).broadcastProgress) {
              (global as any).broadcastProgress(sessionId, step, progress, message);
            }
          };
          
          // Generate the video with AI-optimized timing and progress tracking
          const result = await generateVideo(imagePrompts, voiceId, onProgress);

          // Generate unique filename with UUID for security
          const videoId = randomUUID();
          const videoFileName = `${videoId}.mp4`;

          // Ensure videos directory exists
          const publicVideoPath = path.join(process.cwd(), 'public', 'videos');
          if (!fs.existsSync(publicVideoPath)) {
            fs.mkdirSync(publicVideoPath, { recursive: true });
          }
          
          // Move video from /tmp to public/videos with UUID name
          const finalVideoPath = path.join(publicVideoPath, videoFileName);
          fs.renameSync(result.videoPath, finalVideoPath);

          // Create public URL for video access
          const publicVideoUrl = `${req.protocol}://${req.get('host')}/video/${videoFileName}`;

          console.log("Video generation completed:", {
            duration: result.duration,
            timings: result.optimizedTimings,
            videoUrl: publicVideoUrl
          });

          // Broadcast completion via WebSocket
          if ((global as any).broadcastProgress) {
            (global as any).broadcastProgress(sessionId, 'completed', 100, 'Video generation completed successfully!', {
              videoUrl: publicVideoUrl,
              duration: result.duration,
              optimizedTimings: result.optimizedTimings
            });
          }

        } catch (error) {
          console.error("Video generation error:", error);
          
          let errorCode = "INTERNAL_ERROR";
          let errorMessage = "Video generation failed";
          let errorDetails = "An unexpected error occurred";

          if (error instanceof Error) {
            if (error.message.includes('TTS generation failed')) {
              errorCode = "TTS_SERVICE_ERROR";
              errorMessage = "Failed to generate audio for video";
              errorDetails = "Please check your text-to-speech service configuration";
            } else if (error.message.includes('Image generation failed')) {
              errorCode = "IMAGE_SERVICE_ERROR";
              errorMessage = "Failed to generate images for video";
              errorDetails = "Please check your image generation service configuration";
            } else if (error.message.includes('FFmpeg failed')) {
              errorCode = "VIDEO_PROCESSING_ERROR";
              errorMessage = "Failed to process video";
              errorDetails = "Video encoding failed. Please try again";
            }
          }

          // Broadcast error via WebSocket
          if ((global as any).broadcastProgress) {
            (global as any).broadcastProgress(sessionId, 'error', 0, `Error: ${errorMessage}`, {
              error: {
                code: errorCode,
                message: errorMessage,
                details: errorDetails
              }
            });
          }
        }
      })();

    } catch (error) {
      console.error("Video generation request parsing error:", error);
      res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid request format",
          details: "Please check your request parameters"
        }
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
