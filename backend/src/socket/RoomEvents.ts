import { Socket } from "socket.io";
import RoomManager from "../services/RoomManager";

export default function registerRoomEvents(
    socket: Socket
) {

    socket.on("create-room", () => {

        const code = RoomManager.createRoom(socket.id);

        socket.join(code);

        socket.emit("room-created", code);

        console.log("✅ Sala creada:", code);

    });

    socket.on("join-room", (code: string) => {

        const success = RoomManager.joinRoom(code, socket.id);

        if (!success) {

            socket.emit("join-error");

            return;

        }

        socket.join(code);

        socket.emit("joined-room", code);

// Avisar al creador de la sala
socket.to(code).emit("receiver-connected");

        console.log(`🟢 ${socket.id} se unió a ${code}`);

    });

}