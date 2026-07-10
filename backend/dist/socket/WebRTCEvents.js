export default function registerWebRTCEvents(socket) {
    socket.on("offer", ({ room, offer }) => {
        console.log("📨 BACKEND Offer", room);
        socket.to(room).emit("offer", offer);
    });
    socket.on("answer", ({ room, answer }) => {
        console.log("📨 BACKEND Answer", room);
        socket.to(room).emit("answer", answer);
    });
    socket.on("ice-candidate", ({ room, candidate }) => {
        console.log("🧊 BACKEND ICE", room);
        socket.to(room).emit("ice-candidate", candidate);
    });
}
