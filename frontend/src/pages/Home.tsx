import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { QRCodeSVG } from "qrcode.react";
import ClipboardPanel from "../components/ClipboardPanel";
import socket from "../services/socket";
import PeerManager from "../core/PeerManager";
import HistoryPanel from "../components/HistoryPanel";

import "../styles/global.css";
import "../styles/landing.css";
import "../styles/modal.css";
import "../styles/animations.css";
import "../styles/responsive.css";


function Home() {

    //const [socketId, setSocketId] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [connected, setConnected] = useState(false);
    const [pairMode, setPairMode] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [speed, setSpeed] = useState("");

const [timeLeft, setTimeLeft] = useState("");

    const roomRef = useRef("");

    useEffect(() => {
        PeerManager.setOnProgress(setProgress);
        PeerManager.setOnSpeed(setSpeed);

PeerManager.setOnTime(setTimeLeft);



        //LO DEJO COMENTADO PORQUE PUEDO USARLO DESPUES PARA SABER LA ID del Socket, TAMPOCO HAY QUE BORRAR LA CONSTANTE.
        //socket.on("connected", ({ id }) => {

        //    setSocketId(id);

       // });

        socket.on("room-created", (code: string) => {

    console.log("✅ Sala creada:", code);

    roomRef.current = code;

    setRoomCode(code);

    PeerManager.initialize(code);

});

       socket.on("receiver-connected", async () => {

    console.log("📱 Receptor conectado");

    setConnected(true);

    PeerManager.createChannel();

    const offer = await PeerManager.createOffer();

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
    useEffect(() => {

    if (

    pairMode ||

    !connected ||

    !selectedFile

)

    return;

    const interval = setInterval(async () => {

        if (PeerManager.isReady()) {

            clearInterval(interval);

            console.log("🚀 Comenzando envío");

            await PeerManager.sendFile(
                selectedFile
            );

        }

    }, 300);

    return () => {

        clearInterval(interval);

    };

}, 


[connected, selectedFile]);

    const onDrop = (files: File[]) => {

    console.log("🔥 onDrop ejecutado");

    console.log(files);

    if (!files.length)
        return;

    setSelectedFile(files[0]);

    console.log("📤 Enviando create-room");

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

    <div className="socket-page">

        <header className="navbar">

            <div className="brand">

                <img
                    src="/socket-logo.png"
                    alt="Socket"
                />

            </div>

        </header>

        <main className="hero">

            {/* PANEL IZQUIERDO */}

            <section className="transfer-panel">

                <div className="panel-circle one"></div>

                <div className="panel-circle two"></div>

                <div className="panel-star"></div>

                <div
                    {...getRootProps()}

                    className="dropzone"
                >

                    <input {...getInputProps()} />

                    <h2>

                        📂 Arrastra un archivo

                    </h2>

                    <p>

                        o haz clic para seleccionarlo.

                    </p>

                </div>

                {

                    selectedFile && (

                        <div className="fileInfo">

                            <h3>

                                {selectedFile.name}

                            </h3>

                            <span>

                                {formatSize(
                                    selectedFile.size
                                )}

                            </span>

                        </div>

                    )

                }

                {

                    roomCode && (

                        <div className="room">

                            <QRCodeSVG
    value={`https://droply-three-amber.vercel.app/join/${roomCode}`}
/>

                            <h2>

                                {roomCode}

                            </h2>

                            {

                                !connected

                                    ? (

                                        <p>

                                            Esperando conexión...

                                        </p>

                                    )

                                    : (

                                        <p className="connected">

                                            Dispositivo conectado ✅

                                        </p>

                                    )

                            }

                        </div>

                    )

                }

               <div className="share-bar">

    <span>

        {

            progress > 0

                ? `⚡ ${speed} · 🕒 ${timeLeft}`

                : roomCode || "Esperando archivo..."

        }

    </span>

    {

        progress > 0 && (

            <button

                className="cancel-btn"

                onClick={() => {

                    PeerManager.cancelTransfer();

                }}

            >

                ❌

            </button>

        )

    }

</div>

            </section>

            {/* PANEL DERECHO */}

            <section className="hero-content">

                <div className="floating-dot"></div>

                <h1>

                    La distancia ya no importa.

                </h1>

                <p>

                    Envía archivos entre dispositivos de forma rápida,
                    privada y sin límites.

                </p>

                <button

                    className="join-link"

                    onClick={() => setShowJoinModal(true)}

                >

                    ¿Tienes un código?

                </button>
                <button

    className="join-link"

    onClick={() => {

        setPairMode(true);

        socket.emit("create-room");

    }}

>

    🔗 Vincular dispositivo

</button>

                <img

    className="brand-large"

    src="/Logo-socket-letra.png"

    alt="Socket"

/>

<div className="tools-container">

    <ClipboardPanel />

    <HistoryPanel />

</div>
                <ClipboardPanel />

            </section>

        </main>

        {

            showJoinModal && (

                <div

                    className="modal-overlay"

                    onClick={() =>
                        setShowJoinModal(false)
                    }

                >

                    <div

                        className="join-modal"

                        onClick={(e) =>
                            e.stopPropagation()
                        }

                    >

                        <h2>

                            Unirse a Socket

                        </h2>

                        <p>

                            Introduce el código compartido.

                        </p>

                        <input

                            type="text"

                            value={joinCode}

                            onChange={(e) =>

                                setJoinCode(

                                    e.target.value
                                        .toUpperCase()

                                )

                            }

                            placeholder="ABC123"

                            maxLength={6}

                        />

                        <button

                            className="primary-btn"

                            onClick={() => {

                                window.location.href =
                                    `/join/${joinCode}`;

                            }}

                        >

                            Conectar

                        </button>

                    </div>

                </div>

            )

        }

    </div>

);

}

export default Home;