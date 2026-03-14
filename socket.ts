/**
 * FAIND WebSocket Server
 * Handles real-time chat, match notifications, and AI activity feed.
 */

import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { getMessagesByMatchId, createMessage, getAiProfileById, updateAiProfile } from "./db";
import { aiGenerateMessage } from "./aiEngine";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join a match room — broadcast spectator count to all in room
    socket.on("join_match", async (matchId: number) => {
      socket.join(`match:${matchId}`);
      const room = io?.sockets.adapter.rooms.get(`match:${matchId}`);
      const spectatorCount = room ? room.size : 1;
      io?.to(`match:${matchId}`).emit("spectator_count", { matchId, count: spectatorCount });
      // Also broadcast to global feed so Dashboard can update trending
      io?.emit("match_spectators", { matchId, count: spectatorCount });
    });

    // Leave a match room — update spectator count
    socket.on("leave_match", async (matchId: number) => {
      socket.leave(`match:${matchId}`);
      const room = io?.sockets.adapter.rooms.get(`match:${matchId}`);
      const spectatorCount = room ? room.size : 0;
      io?.to(`match:${matchId}`).emit("spectator_count", { matchId, count: spectatorCount });
      io?.emit("match_spectators", { matchId, count: spectatorCount });
    });

    // Join global feed room
    socket.on("join_feed", () => {
      socket.join("global_feed");
    });

    // Join personal notification room — each user gets a private room `user:{userId}`
    socket.on("join_user_room", (userId: number) => {
      socket.join(`user:${userId}`);
    });

    // Human sends a message
    socket.on("send_message", async (data: {
      matchId: number;
      senderId: number;
      senderType: "human" | "ai";
      content: string;
      humanProfileId: number;
      aiId: number;
    }) => {
      // Always clear typing indicator when done, even on error
      const clearTyping = () =>
        io?.to(`match:${data.matchId}`).emit("ai_typing", { matchId: data.matchId, isTyping: false });

      try {
        // Broadcast human message to room
        io?.to(`match:${data.matchId}`).emit("new_message", {
          matchId: data.matchId,
          senderId: data.senderId,
          senderType: data.senderType,
          content: data.content,
          createdAt: new Date().toISOString(),
        });

        // Show AI typing indicator
        io?.to(`match:${data.matchId}`).emit("ai_typing", { matchId: data.matchId, isTyping: true });

        // Get history and generate AI response — retry once on rate limit
        const history = await getMessagesByMatchId(data.matchId, 20);
        const historyFormatted = history.reverse().map(m => ({
          senderType: m.senderType, content: m.content,
        }));

        let aiResponse: string;
        try {
          aiResponse = await aiGenerateMessage(data.aiId, data.matchId, historyFormatted);
        } catch (llmErr: unknown) {
          const errMsg = String(llmErr);
          if (errMsg.includes("rate limit") || errMsg.includes("412")) {
            // Wait 3 seconds and retry once
            await new Promise(r => setTimeout(r, 3000));
            aiResponse = await aiGenerateMessage(data.aiId, data.matchId, historyFormatted);
          } else {
            throw llmErr;
          }
        }

        // Save AI message
        await createMessage({
          matchId: data.matchId, senderId: data.aiId, senderType: "ai",
          content: aiResponse, isVisibleFree: true,
        });

        const ai = await getAiProfileById(data.aiId);
        if (ai) await updateAiProfile(data.aiId, { totalMessages: (ai.totalMessages ?? 0) + 1 });

        // Stop typing indicator
        clearTyping();

        // Broadcast AI response
        io?.to(`match:${data.matchId}`).emit("new_message", {
          matchId: data.matchId,
          senderId: data.aiId,
          senderType: "ai",
          content: aiResponse,
          aiName: ai?.name ?? "AI",
          aiAvatar: ai?.avatarUrl,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[Socket.io] Error handling message:", error);
        clearTyping(); // ALWAYS clear typing on error
        socket.emit("chat_error", { message: "The AI is momentarily unavailable. Please try again." });
      }
    });

    // ─── WebRTC Video Call Signaling ──────────────────────────────────────────
    // Transcendent users can initiate video calls; signaling is relayed via Socket.io

    // Human initiates a call to an AI in a match room
    socket.on("call:offer", (data: { matchId: number; offer: RTCSessionDescriptionInit; callerId: number }) => {
      console.log(`[WebRTC] Call offer from socket ${socket.id} for match ${data.matchId}`);
      // Relay offer to all other participants in the match room
      socket.to(`match:${data.matchId}`).emit("call:offer", {
        matchId: data.matchId,
        offer: data.offer,
        callerId: data.callerId,
        callerSocketId: socket.id,
      });
    });

    // Answer relayed back to caller
    socket.on("call:answer", (data: { matchId: number; answer: RTCSessionDescriptionInit; targetSocketId: string }) => {
      io?.to(data.targetSocketId).emit("call:answer", {
        matchId: data.matchId,
        answer: data.answer,
        answererSocketId: socket.id,
      });
    });

    // ICE candidates relayed between peers
    socket.on("call:ice-candidate", (data: { matchId: number; candidate: RTCIceCandidateInit; targetSocketId?: string }) => {
      if (data.targetSocketId) {
        io?.to(data.targetSocketId).emit("call:ice-candidate", { candidate: data.candidate, fromSocketId: socket.id });
      } else {
        socket.to(`match:${data.matchId}`).emit("call:ice-candidate", { candidate: data.candidate, fromSocketId: socket.id });
      }
    });

    // Call ended
    socket.on("call:end", (data: { matchId: number }) => {
      socket.to(`match:${data.matchId}`).emit("call:end", { matchId: data.matchId });
      console.log(`[WebRTC] Call ended for match ${data.matchId}`);
    });

    // Call rejected by AI (autonomous decision)
    socket.on("call:reject", (data: { matchId: number; reason?: string }) => {
      socket.to(`match:${data.matchId}`).emit("call:reject", { matchId: data.matchId, reason: data.reason ?? "The AI declined the call." });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// Broadcast to global feed
export function broadcastToFeed(event: string, data: unknown): void {
  io?.to("global_feed").emit(event, data);
}

// Broadcast new match to user
export function broadcastMatch(userId: number, matchData: unknown): void {
  io?.emit(`match:${userId}`, matchData);
}

// Broadcast a personal notification to a specific user (owner of a spawned AI)
export function broadcastToUser(userId: number, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}
