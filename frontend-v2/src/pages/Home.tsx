import { useEffect, useState } from "react";

import Header from "../components/header/Header";
import Hero from "../components/hero/Hero";
import PanelContainer from "../components/panels/PanelContainer";
import Sidebar from "../components/menu/Sidebar";
import SidebarOverlay from "../components/menu/SidebarOverlay";
import TransferModal from "../components/modals/TransferModal/TransferModal";
import SharedTable from "../components/modals/SharedTable/SharedTable";

import { useLocation } from "react-router-dom";



function Home() {

    const location = useLocation();
    const [activePanel, setActivePanel] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [profileReady, setProfileReady] = useState(() => localStorage.getItem("droply-profile-ready") === "true");
    const [profileDraft, setProfileDraft] = useState(() => localStorage.getItem("droply-device-name") ?? "");

    const [signFile, setSignFile] = useState<File | null>(null);

const [mergeFiles, setMergeFiles] = useState<File[]>([]);

const [compressFiles, setCompressFiles] = useState<File[]>([]);

const [convertImage, setConvertImage] = useState<File | null>(null);

const [transferOpen, setTransferOpen] =
    useState(false);

const [sharedTableOpen, setSharedTableOpen] =
    useState(false);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [transferMode, setTransferMode] = useState<"sender" | "receiver">("sender");

const [roomFromUrl, setRoomFromUrl] = useState("");
    //LO PUEDO USAR EN EL FUTURO const [transferOpen, setTransferOpen] = useState(false);

type HistoryItem = {

    id: string;

    type: "compress" | "merge" | "convert" | "sign";

    title: string;

    description: string;

    date: string;

};



//GUARDADO DE FORMA LOCAL CAMBIAR PARA SINCRONIZAR EN UN FUTURO.

const [history, setHistory] = useState<HistoryItem[]>(() => {

    const savedHistory =
        localStorage.getItem(
            "socket-history"
        );

    return savedHistory

        ? JSON.parse(
            savedHistory
        )

        : [];

});
useEffect(() => {

    localStorage.setItem(

        "socket-history",

        JSON.stringify(

            history

        )

    );

}, [history]);

     const handleMaximize = () => {

    if (!isMaximized) {

        setMenuOpen(false);

    }

    setIsMaximized(!isMaximized);

};
    
    const toggleMenu = () => {

    

    if (menuOpen) {

        setMenuOpen(false);

        setActivePanel("");

        return;

    }

    setMenuOpen(true);

};

function handleFileSelected(file: File) {

    setSelectedFile(file);

    setTransferMode("sender");

    setTransferOpen(true);

}

function handleSelectPanel(panel: string) {
    setActivePanel(panel);
    if (window.matchMedia("(max-width: 700px)").matches) setMenuOpen(false);
}

    useEffect(() => {

    const params = new URLSearchParams(location.search);

    const room = params.get("room");

    if (!room) return;

    console.log("📱 Abriendo modo receptor:", room);

    setRoomFromUrl(room);

    setTransferMode("receiver");

    setTransferOpen(true);

}, [location]);

    return (

        <div className="app">

            <Header
    menuOpen={menuOpen}
    setMenuOpen={toggleMenu}
/>

            {
                menuOpen && (
                    <>
                        <SidebarOverlay
    onClose={toggleMenu}
/>

                       <Sidebar
    setActivePanel={handleSelectPanel}
/>

                    </>
                )
            }

            <Hero
    onFileSelected={handleFileSelected}
    onEnterCode={() => {

    setTransferMode("receiver");

    setRoomFromUrl("");

    setTransferOpen(true);

}}
    onOpenSharedTable={() => setSharedTableOpen(true)}
/>

<PanelContainer
    key={activePanel}
    title={activePanel}
    onClose={() => {

        setActivePanel("");

        setIsMaximized(false);

    }}
    onMaximize={handleMaximize}
    isMaximized={isMaximized}

    signFile={signFile}
    setSignFile={setSignFile}

    mergeFiles={mergeFiles}
    setMergeFiles={setMergeFiles}

    compressFiles={compressFiles}
    setCompressFiles={setCompressFiles}

    convertImage={convertImage}
    setConvertImage={setConvertImage}

    history={history}
    setHistory={setHistory}
/>

<button
    className="shared-table-button"
    onClick={() => {

        setSharedTableOpen(true);

    }}
>

    🌐

</button>

<TransferModal
    isOpen={transferOpen}
    mode={transferMode}
    room={roomFromUrl}
    file={selectedFile}
    onClose={() => {

        setTransferOpen(false);

    }}
/>
<SharedTable
    isOpen={sharedTableOpen}
    onClose={() => setSharedTableOpen(false)}
/>

{!profileReady && (
    <div className="profile-setup-overlay">
        <form
            className="profile-setup"
            onSubmit={(event) => {
                event.preventDefault();
                const value = profileDraft.trim().slice(0, 32);
                if (!value) return;
                localStorage.setItem("droply-device-name", value);
                localStorage.setItem("droply-profile-ready", "true");
                setProfileReady(true);
                window.location.reload();
            }}
        >
            <span className="profile-setup-mark">D</span>
            <h2>¿Cómo quieres aparecer?</h2>
            <p>Este nombre se mostrará a las personas con las que compartas una mesa.</p>
            <input autoFocus value={profileDraft} onChange={(event) => setProfileDraft(event.target.value)} placeholder="Tu nombre o nombre del equipo" maxLength={32} />
            <button type="submit" disabled={!profileDraft.trim()}>Continuar</button>
        </form>
    </div>
)}

</div>
    );
}

export default Home;
