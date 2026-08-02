import { Socket } from "socket.io";
import { createRateLimiter, isRoomMember, isSafeId } from "../security.js";

const allowSignal = createRateLimiter(240, 60_000);

export default function registerWebRTCEvents(socket: Socket) {

    const relayToRoomMember = (
        targetSocketId: unknown,
        event: string,
        payload: Record<string, unknown>
    ) => {
        if (!isSafeId(targetSocketId) || !allowSignal(socket, "targeted-signal")) return;
        const room = socket.data.roomCode as string | undefined;
        const target = socket.nsp.sockets.get(targetSocketId as string);
        if (!room || !target || target.data.roomCode !== room) return;
        target.emit(event, { ...payload, sourceSocketId: socket.id });
    };

    socket.on("offer", ({ room, offer }) => {

        if (!isRoomMember(socket, room) || !offer || !allowSignal(socket, "signal")) return;

        console.log("📨 BACKEND Offer", room);

        socket.to(room).emit("offer", offer);

    });

    socket.on("answer", ({ room, answer }) => {

        if (!isRoomMember(socket, room) || !answer || !allowSignal(socket, "signal")) return;

        console.log("📨 BACKEND Answer", room);

        socket.to(room).emit("answer", answer);

    });

    socket.on("ice-candidate", ({ room, candidate }) => {

        if (!isRoomMember(socket, room) || !candidate || !allowSignal(socket, "signal")) return;

        console.log("🧊 BACKEND ICE", room);

        socket.to(room).emit("ice-candidate", candidate);

    });

    socket.on("download-offer", ({ targetSocketId, itemId, offer }) => {
        if (!offer || !isSafeId(itemId)) return;
        relayToRoomMember(targetSocketId, "download-offer", { itemId, offer });
    });

    socket.on("download-answer", ({ targetSocketId, itemId, answer }) => {
        if (!answer || !isSafeId(itemId)) return;
        relayToRoomMember(targetSocketId, "download-answer", { itemId, answer });
    });

    socket.on("download-ice-candidate", ({ targetSocketId, itemId, candidate }) => {
        if (!candidate || !isSafeId(itemId)) return;
        relayToRoomMember(targetSocketId, "download-ice-candidate", { itemId, candidate });
    });

}
