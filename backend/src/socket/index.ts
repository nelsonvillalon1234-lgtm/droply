import { Server, Socket } from "socket.io";

import registerConnectionEvents from "./ConnectionEvents.js";
import registerRoomEvents from "./RoomEvents.js";
import registerWebRTCEvents from "./WebRTCEvents.js";
import registerSharedTableEvents from "./SharedTableEvents.js";

export default function registerSocketEvents(
    io: Server,
    socket: Socket
) {

    registerConnectionEvents(socket);

    registerRoomEvents(socket);

    registerSharedTableEvents(io, socket);

    registerWebRTCEvents(socket);

}
