import { Server, Socket } from "socket.io";
import DeviceManager from "../services/DeviceManager.js";
import { createRateLimiter, finiteNumber, isRoomMember, isSafeId } from "../security.js";

const allowRequest = createRateLimiter(30, 60_000);

export default function registerSharedTableEvents(
    io: Server,
    socket: Socket
) {

    socket.on("PING_TEST", () => {

    console.log("🔥 PING recibido");

});

    socket.on(
        "table-file-moved",
        (payload: unknown) => {

            if (!payload || typeof payload !== "object") return;
            const { roomCode, fileId, x, y } = payload as Record<string, unknown>;
            const safeX = finiteNumber(x, -20_000, 20_000);
            const safeY = finiteNumber(y, -20_000, 20_000);
            if (!isRoomMember(socket, roomCode) || !isSafeId(fileId) || safeX === null || safeY === null) return;

            console.log("📦 Backend recibió table-file-moved");

            socket.to(roomCode as string).emit(
                "table-file-moved",
                {
                    fileId,
                    x: safeX,
                    y: safeY
                }
            );

        }
    );

    socket.on(
        "table-file-removed",
        (payload: unknown) => {

            if (!payload || typeof payload !== "object") return;
            const { roomCode, fileId } = payload as Record<string, unknown>;
            if (!isRoomMember(socket, roomCode) || !isSafeId(fileId)) return;

            console.log("🗑️ Backend recibió table-file-removed");

            socket.to(roomCode as string).emit(
                "table-file-removed",
                fileId
            );

        }
    );

    socket.on(
    "download-request",
    (payload: unknown) => {

        if (!payload || typeof payload !== "object" || !allowRequest(socket, "download")) return;
        const { itemId, ownerId } = payload as Record<string, unknown>;
        if (!isSafeId(itemId) || !isSafeId(ownerId)) return;

        console.log("📥 Solicitud de descarga:", itemId);

        const socketId =
            DeviceManager.getSocketByDevice(ownerId as string);

        if (!socketId) {

            console.log("❌ Propietario no conectado");

            return;

        }

        const ownerSocket = io.sockets.sockets.get(socketId);
        const requesterRoom = socket.data.roomCode as string | undefined;
        if (!requesterRoom || ownerSocket?.data.roomCode !== requesterRoom) return;

        io.to(socketId).emit(
            "download-request",
            {
                itemId: itemId as string,
                requesterSocketId: socket.id,
            }
        );

        console.log(
            "📤 Solicitud enviada al propietario"
        );

    }
);

}
