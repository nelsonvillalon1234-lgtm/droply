import { useState } from "react";

import JSZip from "jszip";

import FileDropzone from "../ui/FileDropzone";

type HistoryItem = {

    id: string;

    type: "compress" | "merge" | "convert" | "sign";

    title: string;

    description: string;

    date: string;

};

type CompressPanelProps = {

    files: File[];

    setFiles: React.Dispatch<
        React.SetStateAction<File[]>
    >;

    history: HistoryItem[];

    setHistory: React.Dispatch<
        React.SetStateAction<
            HistoryItem[]
        >
    >;

};

function CompressPanel({

    files,

    setFiles,

    setHistory

}: CompressPanelProps) {

    const [zipName, setZipName] = useState(
        "socket-archivos"
    );

    const [isCompressing, setIsCompressing] =
        useState(false);

    const [originalSize, setOriginalSize] = useState(0);

const [compressedSize, setCompressedSize] = useState(0);

    const visibleFiles = files.slice(0, 100);

    const savedPercentage = Math.max(

    0,

    Math.round(

        100 -

        (compressedSize * 100) /

        originalSize

    )

);

    const compressFiles = async () => {

        if (files.length === 0) {

            return;

        }

        setIsCompressing(true);

        const zip = new JSZip();

        files.forEach((file) => {

            zip.file(
                file.name,
                file
            );

        });

        const content =
            await zip.generateAsync({

                type: "blob"

            });

        setCompressedSize(

                content.size

        );   

        const url =
            URL.createObjectURL(content);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `${zipName}.zip`;

        link.click();

        URL.revokeObjectURL(url);

        setHistory((current) => [

    {

        id: crypto.randomUUID(),

        type: "compress",

        title: `${zipName}.zip`,

        description:

            `${files.length} archivos`,

        date:

            new Date()

                .toLocaleString()

    },

    ...current

]);

        setIsCompressing(false);

    };

    return (

        <>

            {files.length === 0 && (

                <FileDropzone

                    title="📦 Arrastra tus archivos"

                    subtitle="
                    o haz clic para seleccionarlos
                    "

                    multiple={true}

                    accept={{}}

                    onDrop={(acceptedFiles) => {

                        setFiles(acceptedFiles);

const total = acceptedFiles.reduce(

    (sum, file) => sum + file.size,

    0

);

setOriginalSize(total);

                    }}

                />

            )}

            {files.length > 0 && (

                <div className="pdf-viewer">

                    <div className="pdf-header">

                        <div className="pdf-info">

                            <h3>

                                {files.length} archivos

                            </h3>

                            <p>

                                Listos para comprimir.

                            </p>
                        <div className="compress-stats">

    <span>

        {(originalSize / 1024 / 1024).toFixed(1)}
        {" "}MB originales

    </span>

    {

        compressedSize > 0 && (

            <>

                <span>

                    {(compressedSize / 1024 / 1024).toFixed(1)}
                    {" "}MB comprimidos

                </span>

                <span className="compress-saved">

                    ↓ {savedPercentage}%

                </span>

            </>

        )

    }

</div>

                        </div>

                    </div>

                    <div className="compress-options">

                        <label>

                            Nombre del archivo

                        </label>
                    <div className="compress-bar">

    <div

        className="compress-bar-fill"

        style={{

            width:

    compressedSize > 0

        ? `${savedPercentage}%`

        : "0%"

        }}

    />

</div>

                        <input

                            className="compress-input"

                            value={zipName}

                            onChange={(e) => {

                                setZipName(
                                    e.target.value
                                );

                            }}

                        />

                    </div>
                    {

    files.length > 100 && (

        <p className="compress-limit">

    Mostrando 100 de

    {" "}

    {files.length}

    archivos.

    Los demás se comprimirán igualmente.

</p>

    )

}

                    <div className="merge-files-list">

                        {

                            visibleFiles.map((file) => (

                                <div
                                    key={file.name}
                                    className="merge-file-card"
                                >

                                    <div>

                                        📄 {file.name}

                                    </div>

                                    <span>

                                        {

                                            (
                                                file.size /
                                                1024
                                            ).toFixed(0)

                                        }

                                        {" "}KB

                                    </span>

                                </div>

                            ))

                        }

                    </div>

                    <div className="pdf-actions">

                        {

                            isCompressing ? (

                                <div className="merge-loading">

                                    <div className="merge-spinner" />

                                    <p>

                                        Comprimiendo...

                                    </p>

                                </div>

                            ) : (

                                <>

                                    <button
                                        className="pdf-button"
                                        onClick={compressFiles}
                                    >

                                        📦 Comprimir

                                    </button>

                                    <button
                                        className="pdf-button secondary"
                                        onClick={() => {

                                                setFiles([]);

                                                 setOriginalSize(0);

                                                setCompressedSize(0);

                                        }}
                                    >

                                        ↺ Reemplazar

                                    </button>

                                </>

                            )

                        }

                    </div>

                </div>

            )}

        </>

    );

}

export default CompressPanel;