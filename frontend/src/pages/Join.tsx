const [connected, setConnected] = useState(false);
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import socket from "../services/socket";
import PeerManager from "../core/PeerManager";

import "../App.css";

function Join() {

    const { code } = useParams();

    const [roomCode, setRoomCode] = useState(code?.toUpperCase() ?? "");

    // Siempre tendrá el código más actualizado
    const roomRef = useRef(code?.toUpperCase() ?? "");

    useEffect(() => {

        socket.on("joined-room", () => {

    console.log("✅ Unido a la sala");

    setConnected(true);

});

        socket.on("offer", async (offer) => {

            console.log("📨 Offer recibida");

            console.log("Sala usada:", roomRef.current);

            PeerManager.initialize(roomRef.current);

            await PeerManager.setRemoteDescription(offer);

            const answer = await PeerManager.createAnswer();

            console.log("📨 Enviando Answer");

            socket.emit("answer", {

                room: roomRef.current,

                answer

            });

        });

        socket.on("ice-candidate", async (candidate) => {

            await PeerManager.addIceCandidate(candidate);

        });

        if (code) {

            roomRef.current = code.toUpperCase();

            PeerManager.initialize(roomRef.current);

            socket.emit("join-room", roomRef.current);

        }

        return () => {

            socket.off("joined-room");
            socket.off("offer");
            socket.off("ice-candidate");

        };

    }, []);

    function connect() {

        if (!roomRef.current)
            return;

        PeerManager.initialize(roomRef.current);

        socket.emit("join-room", roomRef.current);

    }

    return (

        <div className="container">

            <div className="card">

                <h1>Droply</h1>

                <p>Ingresa el código</p>

                <input

                    value={roomCode}

                    onChange={(e) => {

                        const value = e.target.value.toUpperCase();

                        roomRef.current = value;

                        setRoomCode(value);

                    }}

                    style={{
                        width: "100%",
                        padding: "15px",
                        marginTop: "25px",
                        fontSize: "22px",
                        textAlign: "center"
                    }}

                />

                {!code && (

    <button
    onClick={connect}
    disabled={connected}
    style={{
        marginTop: "20px",
        width: "100%",
        padding: "15px",
        cursor: connected ? "default" : "pointer",
        opacity: connected ? 0.5 : 1
    }}
>
    {connected ? "Conectado ✅" : "Conectar"}
</button>

)}

            </div>

        </div>

    );

}

export default Join;