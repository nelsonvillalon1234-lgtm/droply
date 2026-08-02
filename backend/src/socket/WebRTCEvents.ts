import { Socket } from "socket.io";
import { createRateLimiter, isRoomMember } from "../security.js";

const allowSignal = createRateLimiter(240, 60_000);

export default function registerWebRTCEvents(socket: Socket) {

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

}
