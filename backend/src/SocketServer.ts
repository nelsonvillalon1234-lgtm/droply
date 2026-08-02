import { Server, Socket } from "socket.io";

import registerRoomEvents from "./socket/RoomEvents.js";
import registerConnectionEvents from "./socket/ConnectionEvents.js";
import registerWebRTCEvents from "./socket/WebRTCEvents.js";
import registerSharedTableEvents from "./socket/SharedTableEvents.js";

export default function setupSocket(io: Server) {

    io.on("connection", (socket: Socket) => {

        console.log("🟢 Nuevo cliente:", socket.id);
        console.log("🔥 SharedTableEvents registrado");

        registerConnectionEvents(socket);

        registerRoomEvents(socket);

        registerSharedTableEvents(io, socket);

        registerWebRTCEvents(socket);

    });

}