import { useState } from "react";

import Header from "../components/header/Header";
import Hero from "../components/hero/Hero";
import PanelContainer from "../components/panels/PanelContainer";
import Sidebar from "../components/menu/Sidebar";
import SidebarOverlay from "../components/menu/SidebarOverlay";

function Home() {

    const [activePanel, setActivePanel] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    const [signFile, setSignFile] = useState<File | null>(null);

const [mergeFiles, setMergeFiles] = useState<File[]>([]);

const [compressFiles, setCompressFiles] = useState<File[]>([]);

const [convertImage, setConvertImage] = useState<File | null>(null);

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
    setActivePanel={setActivePanel}
/>

                    </>
                )
            }

            <Hero />

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
/>

        </div>
    );
}

export default Home;