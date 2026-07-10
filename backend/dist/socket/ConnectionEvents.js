export default function registerConnectionEvents(socket) {
    socket.emit("connected", {
        id: socket.id
    });
    socket.on("disconnect", () => {
        console.log("🔴 Cliente desconectado:", socket.id);
    });
}
