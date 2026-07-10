import registerConnectionEvents from "./ConnectionEvents.js";
import registerRoomEvents from "./RoomEvents.js";
import registerWebRTCEvents from "./WebRTCEvents.js";
export default function registerSocketEvents(io, socket) {
    registerConnectionEvents(socket);
    registerRoomEvents(socket);
    registerWebRTCEvents(socket);
}
