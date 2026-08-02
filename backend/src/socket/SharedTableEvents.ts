import { Server, Socket } from "socket.io";
import DeviceManager from "../services/DeviceManager.js";
import { createRateLimiter, finiteNumber, isRoomMember, isSafeId } from "../security.js";

const allowRequest = createRateLimiter(30, 60_000);
const fileSources = new Map<string, Set<string>>();

export default function registerSharedTableEvents(io: Server, socket: Socket) {
    const sourceKey = (room: string, itemId: string) => `${room}:${itemId}`;
    const deviceIdForSocket = (candidate: Socket) => {
        const device = candidate.data.roomDevice as { id?: unknown } | undefined;
        const id = device?.id;
        return isSafeId(id) ? id as string : null;
    };
    const routeDownload = (room: string, itemId: string, requesterSocketId: string) => {
        const requester = io.sockets.sockets.get(requesterSocketId);
        if (!requester || requester.data.roomCode !== room) return false;
        const candidates = fileSources.get(sourceKey(room, itemId)) ?? new Set<string>();
        for (const sourceDeviceId of candidates) {
            const sourceSocketId = DeviceManager.getSocketByDevice(sourceDeviceId);
            if (!sourceSocketId || sourceSocketId === requesterSocketId) continue;
            const sourceSocket = io.sockets.sockets.get(sourceSocketId);
            if (sourceSocket?.data.roomCode !== room) continue;
            io.to(sourceSocketId).emit("download-request", { itemId, requesterSocketId });
            return true;
        }
        return false;
    };

    socket.on("PING_TEST", () => console.log("PING recibido"));

    socket.on("table-file-moved", (payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const { roomCode, fileId, x, y } = payload as Record<string, unknown>;
        const safeX = finiteNumber(x, -20_000, 20_000);
        const safeY = finiteNumber(y, -20_000, 20_000);
        if (!isRoomMember(socket, roomCode) || !isSafeId(fileId) || safeX === null || safeY === null) return;
        socket.to(roomCode as string).emit("table-file-moved", { fileId, x: safeX, y: safeY });
    });

    socket.on("table-file-removed", (payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const { roomCode, fileId } = payload as Record<string, unknown>;
        if (!isRoomMember(socket, roomCode) || !isSafeId(fileId)) return;
        socket.to(roomCode as string).emit("table-file-removed", fileId);
    });

    socket.on("download-request", (payload: unknown) => {
        if (!payload || typeof payload !== "object" || !allowRequest(socket, "download")) return;
        const { itemId, ownerId } = payload as Record<string, unknown>;
        if (!isSafeId(itemId) || !isSafeId(ownerId)) return;
        const room = socket.data.roomCode as string | undefined;
        if (!room) return;
        const key = sourceKey(room, itemId as string);
        const sources = fileSources.get(key) ?? new Set<string>();
        sources.add(ownerId as string);
        fileSources.set(key, sources);
        if (!routeDownload(room, itemId as string, socket.id)) {
            socket.emit("download-unavailable", { itemId, reason: "owner-offline" });
        }
    });

    socket.on("download-source-added", (payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const { itemId } = payload as Record<string, unknown>;
        const room = socket.data.roomCode as string | undefined;
        const sourceDeviceId = deviceIdForSocket(socket);
        if (!room || !sourceDeviceId || !isSafeId(itemId)) return;
        const key = sourceKey(room, itemId as string);
        const sources = fileSources.get(key) ?? new Set<string>();
        sources.add(sourceDeviceId);
        fileSources.set(key, sources);
        io.to(room).emit("table-item-source-available", { itemId });
    });

    socket.on("download-source-missing", (payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const { itemId, requesterSocketId } = payload as Record<string, unknown>;
        if (!isSafeId(itemId) || !isSafeId(requesterSocketId)) return;
        const requester = io.sockets.sockets.get(requesterSocketId as string);
        const room = socket.data.roomCode as string | undefined;
        if (!room || requester?.data.roomCode !== room) return;
        const sourceDeviceId = deviceIdForSocket(socket);
        if (sourceDeviceId) fileSources.get(sourceKey(room, itemId as string))?.delete(sourceDeviceId);
        if (!routeDownload(room, itemId as string, requesterSocketId as string)) {
            io.to(requesterSocketId as string).emit("download-unavailable", { itemId, reason: "source-missing" });
        }
    });
}
