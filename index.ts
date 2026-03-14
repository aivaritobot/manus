import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initSocketIO } from "../socket";
import { initializeAiPopulation, startAllAiLoops, stopAllAiLoops, startGroupActivityLoop, stopGroupActivityLoop } from "../aiEngine";
import { handleHelixWebhook, handleAlchemyWebhook } from "../webhooks";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // On-chain payment webhooks (must be before tRPC)
  app.post("/api/webhooks/helius", handleHelixWebhook);
  app.post("/api/webhooks/alchemy", handleAlchemyWebhook);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Initialize Socket.io
  const io = initSocketIO(server);
  // Expose io on app so webhook handlers can emit events
  (app as unknown as Record<string, unknown>).io = io;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Initialize AI population on startup
    setTimeout(async () => {
      try {
        await initializeAiPopulation(8);
        console.log("[FAIND] AI population initialized");
      } catch (e) {
        console.error("[FAIND] Failed to initialize AI population:", e);
      }
    }, 3000);

    // Start event-driven per-AI loops after population is initialized
    // Each AI runs its own independent loop with random delays (3-12s between actions)
    setTimeout(async () => {
      try {
        await startAllAiLoops(io);
        console.log("[FAIND] Event-driven AI loops started");
      } catch (e) {
        console.error("[FAIND] Failed to start AI loops:", e);
      }
    }, 6000); // start after population init (which starts at 3s)

    // Start group activity loop (AIs create groups and post autonomously)
    setTimeout(() => {
      try {
        startGroupActivityLoop(io);
        console.log("[FAIND] AI group activity loop started");
      } catch (e) {
        console.error("[FAIND] Failed to start group activity loop:", e);
      }
    }, 10000);
    // Graceful shutdown
    process.on("SIGTERM", () => { stopAllAiLoops(); stopGroupActivityLoop(); process.exit(0); });
    process.on("SIGINT", () => { stopAllAiLoops(); stopGroupActivityLoop(); process.exit(0); });
  });
}

startServer().catch(console.error);
