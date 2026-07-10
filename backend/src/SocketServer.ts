import { Server } from "socket.io";
import registerSocketEvents from "./socket/index";

export default function setupSocket(io: Server) {

    io.on("connection", (socket) => {

        console.log("🟢 Nuevo cliente:", socket.id);

        registerSocketEvents(io, socket);

    });

}