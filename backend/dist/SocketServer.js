import registerRoomEvents from "./socket/RoomEvents.js";
import registerConnectionEvents from "./socket/ConnectionEvents.js";
import registerWebRTCEvents from "./socket/WebRTCEvents.js";
export default function setupSocket(io) {
    io.on("connection", (socket) => {
        console.log("🟢 Nuevo cliente:", socket.id);
        registerConnectionEvents(socket);
        registerRoomEvents(socket);
        registerWebRTCEvents(socket);
    });
}
