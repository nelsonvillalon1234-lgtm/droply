import PdfPanel from "./PdfPanel";
import MergePdfPanel from "./MergePdfPanel";
import ConvertPanel from "./ConvertPanel";
import CompressPanel from "./CompressPanel";
import HistoryPanel from "./HistoryPanel";

type HistoryItem = {

    id: string;

    type: "compress" | "merge" | "convert" | "sign";

    title: string;

    description: string;

    date: string;

};

type PanelContainerProps = {
    title: string;
    onClose: () => void;
    onMaximize: () => void;
    isMaximized: boolean;

    signFile: File | null;
    setSignFile: React.Dispatch<
        React.SetStateAction<File | null>
    >;

    mergeFiles: File[];
    setMergeFiles: React.Dispatch<
        React.SetStateAction<File[]>
    >;

    compressFiles: File[];
    setCompressFiles: React.Dispatch<
        React.SetStateAction<File[]>
    >;

    convertImage: File | null;
    setConvertImage: React.Dispatch<
        React.SetStateAction<File | null>
    >;

    history: HistoryItem[];
    setHistory: React.Dispatch<
         React.SetStateAction<HistoryItem[]>
    >;

};

function PanelContainer({
    title,
    onClose,
    isMaximized,

    signFile,
    setSignFile,

    mergeFiles,
    setMergeFiles,

    compressFiles,
    setCompressFiles,

    convertImage,
    setConvertImage,

    history,
    setHistory

}: PanelContainerProps) {

    if (!title) {

        return null;

    }

    return (

        <div
            className={`
                panel-container
                ${isMaximized ? "maximized" : ""}
            `}
        >

            <div className="panel-header">

                <div className="window-controls">

                    <button
                        className="window-button close"
                        onClick={onClose}
                    />

                </div>

                <div className="panel-title">

                    <h1>

                        {title}

                    </h1>

                </div>

            </div>

            {title === "Firmar PDF" && (

                <PdfPanel
    file={signFile}
    setFile={setSignFile}
    setHistory={setHistory}
/>

            )}

            {title === "Unir PDF" && (

                <MergePdfPanel
    files={mergeFiles}
    setFiles={setMergeFiles}
    setHistory={setHistory}
/>

            )}

            {title === "Convertir imágenes" && (

                <ConvertPanel
    file={convertImage}
    setFile={setConvertImage}
    setHistory={setHistory}
/>

            )}

            {title === "Comprimir archivos" && (

                

                <CompressPanel
    files={compressFiles}
    setFiles={setCompressFiles}

    history={history}

    setHistory={setHistory}
/>

            )}

            {title === "Historial" && (

    <HistoryPanel
    history={history}
    setHistory={setHistory}
/>

)}

        </div>

    );

}

export default PanelContainer;