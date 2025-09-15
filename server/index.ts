import express, { type Request, Response, NextFunction } from "express";
import { WebSocketServer } from 'ws';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Setup WebSocket server for real-time progress updates on dedicated path
  const wss = new WebSocketServer({ server, path: "/ws/progress" });
  
  // Store active video generation sessions
  const videoSessions = new Map();
  
  wss.on('connection', (ws, req) => {
    log('WebSocket client connected');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'subscribe' && message.sessionId) {
          // Client wants to subscribe to a video generation session
          if (!videoSessions.has(message.sessionId)) {
            videoSessions.set(message.sessionId, new Set());
          }
          videoSessions.get(message.sessionId).add(ws);
          log(`Client subscribed to session: ${message.sessionId}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from all sessions when disconnected
      const sessionIds = Array.from(videoSessions.keys());
      sessionIds.forEach((sessionId) => {
        const clients = videoSessions.get(sessionId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            videoSessions.delete(sessionId);
          }
        }
      });
      log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Export websocket functionality for use in routes
  (global as any).broadcastProgress = (sessionId: string, step: string, progress: number, message: string, completionData?: any) => {
    const clients = videoSessions.get(sessionId);
    if (clients) {
      const progressData = JSON.stringify({
        type: step === 'completed' || step === 'error' ? step : 'progress',
        sessionId,
        step,
        progress,
        message,
        timestamp: new Date().toISOString(),
        ...(completionData && { data: completionData })
      });
      
      clients.forEach((ws: any) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(progressData);
        }
      });

      // Clean up session after completion or error
      if (step === 'completed' || step === 'error') {
        videoSessions.delete(sessionId);
      }
    }
  };

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`WebSocket server ready for real-time progress updates`);
  });
})();
