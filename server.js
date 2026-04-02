import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Map to track socket.id -> userId
const userSockets = new Map();

app.prepare().then(async () => {
    // Reset all users to OFFLINE on startup
    try {
        await prisma.user.updateMany({
            data: { status: "OFFLINE" }
        });
        console.log("All user statuses reset to OFFLINE");
    } catch (err) {
        console.error("Error resetting user statuses:", err);
    }

    const httpServer = createServer(handle);
    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        socket.on("userOnline", async (userId) => {
            userSockets.set(socket.id, userId);
            socket.join(`user_${userId}`); // Join private user room
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: { status: "ONLINE" }
                });
                io.emit("statusUpdate", { userId, status: "ONLINE" });
                console.log(`User ${userId} is now ONLINE and joined user_${userId}`);
            } catch (err) {
                console.error("Error updating user status:", err);
            }
        });

        socket.on("join", (roomId) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room ${roomId}`);
        });

        socket.on("message", async (data) => {
            // First broadcast to the conversation room as usual
            io.to(data.conversationId).emit("message", data);

            // Also broadcast to each participant's private room to handle new conversations
            try {
                const participants = await prisma.participant.findMany({
                    where: { conversationId: data.conversationId },
                    select: { userId: true }
                });

                participants.forEach(p => {
                    // We emit to the user's private room so they get notified 
                    // even if they haven't joined the conversation room yet
                    io.to(`user_${p.userId}`).emit("message", data);
                });
            } catch (err) {
                console.error("Error fetching participants for broadcast:", err);
            }
        });

        // broadcast edits and deletions
        socket.on("message-edit", (data) => {
            // data should contain conversationId and updated message
            io.to(data.conversationId).emit("message-edit", data);
        });

        socket.on("message-delete", (data) => {
            // data: { conversationId, messageId }
            io.to(data.conversationId).emit("message-delete", data);
        });

        socket.on("read", async ({ conversationId, userId }) => {
            io.to(conversationId).emit("read", { conversationId, userId });
        });

        socket.on("profileUpdate", (data) => {
            // Broadcast profile changes to all users
            io.emit("profileUpdate", data);
        });

        socket.on("disconnect", async () => {
            const userId = userSockets.get(socket.id);
            if (userId) {
                userSockets.delete(socket.id);
                // Check if user has other active sockets
                const sameUserSockets = Array.from(userSockets.values()).filter(id => id === userId);
                if (sameUserSockets.length === 0) {
                    try {
                        await prisma.user.update({
                            where: { id: userId },
                            data: { status: "OFFLINE" }
                        });
                        io.emit("statusUpdate", { userId, status: "OFFLINE" });
                        console.log(`User ${userId} is now OFFLINE`);
                    } catch (err) {
                        console.error("Error updating user status:", err);
                    }
                }
            }
            console.log("User disconnected:", socket.id);
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
