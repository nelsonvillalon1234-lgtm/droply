import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { QRCodeSVG } from "qrcode.react";

import socket from "../services/socket";
import PeerManager from "../core/PeerManager";

import "../App.css";

function Home() {

    const [socketId, setSocketId] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [connected, setConnected] = useState(false);

    const roomRef = useRef("");

    useEffect(() => {

        socket.on("connected", ({ id }) => {

            setSocketId(id);

        });

        socket.on("room-created", (code: string) => {

            roomRef.current = code;

            setRoomCode(code);

            PeerManager.initialize(code);

        });

        socket.on("receiver-connected", async () => {

    console.log("📱 Receptor conectado");

    console.log(
        "Estado actual:",
        PeerManager["peer"]?.signalingState
    );

    PeerManager.createChannel();

    const offer = await PeerManager.createOffer();

    console.log(
        "Offer enviada"
    );

    socket.emit("offer", {
        room: roomRef.current,
        offer
    });

});

       socket.on("answer", async (answer) => {

    console.log("🔥 ANSWER LLEGÓ AL HOST");

    console.log(answer);

    await PeerManager.setRemoteDescription(answer);

    console.log("✅ RemoteDescription aplicada");

});

        socket.on("ice-candidate", async (candidate) => {

            await PeerManager.addIceCandidate(candidate);

        });

        return () => {

            socket.removeAllListeners();

        };

    }, []);

    const onDrop = (files: File[]) => {

        if (!files.length)
            return;

        setSelectedFile(files[0]);

        socket.emit("create-room");

    };

    const { getRootProps, getInputProps } = useDropzone({

        onDrop,

        multiple: false

    });

    function formatSize(bytes: number) {

        if (bytes < 1024)
            return `${bytes} B`;

        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(2)} KB`;

        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / 1024 / 1024).toFixed(2)} MB`;

        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;

    }

    return (

        <div className="container">

            <div className="card">

                <h1>Droply</h1>

                <p className="subtitle">

                    Comparte archivos sin límites

                </p>

                <div

                    {...getRootProps()}

                    className="dropzone"

                >

                    <input {...getInputProps()} />

                    <h2>

                        📂 Arrastra un archivo

                    </h2>

                    <p>

                        o haz clic para seleccionarlo

                    </p>

                </div>

                {

                    selectedFile &&

                    <div className="fileInfo">

                        <h3>Archivo seleccionado</h3>

                        <p>

                            <b>

                                {selectedFile.name}

                            </b>

                        </p>

                        <p>

                            {formatSize(selectedFile.size)}

                        </p>

                    </div>

                }

                {

                    roomCode &&

                    <div className="room">

                        <QRCodeSVG
    value={`https://droply-three-amber.vercel.app/join/${roomCode}`}
    size={180}
/>

                        <h2>

                            {roomCode}

                        </h2>

                        {
    !connected
        ? (
            <p>Esperando conexión...</p>
        )
        : (
            <>

                <p className="connected">

                    Dispositivo conectado ✅

                </p>

                {

                    selectedFile && (

                        <button
    style={{
        marginTop:20,
        width:"100%",
        padding:"15px",
        cursor:"pointer",
        fontSize:"18px"
    }}
    onClick={async () => {

    console.log("🚀 BOTÓN PULSADO");

    if (!selectedFile) {

        console.log("❌ No hay archivo");

        return;

    }

    if (!PeerManager.isReady()) {

        alert("⌛ Espera unos segundos, la conexión aún no está lista.");

        return;

    }

    await PeerManager.sendFile(selectedFile);

}}
>
    🚀 Enviar archivo
</button>

                    )

                }

            </>

        )
}

                    </div>

                }

                <small>

                    Socket

                    <br />

                    {socketId}

                </small>

            </div>

        </div>

    );

}

export default Home;