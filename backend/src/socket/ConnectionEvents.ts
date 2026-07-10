import { Socket } from "socket.io";

export default function registerConnectionEvents(
    socket: Socket
) {

    socket.emit("connected", {
        id: socket.id
    });

    socket.on("disconnect", () => {

        console.log("🔴 Cliente desconectado:", socket.id);

    });

}