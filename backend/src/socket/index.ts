import { Server, Socket } from "socket.io";

import registerConnectionEvents from "./ConnectionEvents";
import registerRoomEvents from "./RoomEvents";
import registerWebRTCEvents from "./WebRTCEvents";

export default function registerSocketEvents(
    io: Server,
    socket: Socket
) {

    registerConnectionEvents(socket);

    registerRoomEvents(socket);

    registerWebRTCEvents(socket);

}