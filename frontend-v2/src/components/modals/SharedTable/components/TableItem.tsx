
import {
    useRef,
    useState
} from "react";
import "./../styles/tableItem.css";


import {
    Archive,
    Check,
    Code2,
    Download,
    FileAudio,
    FileImage,
    FileSpreadsheet,
    FileText,
    FileVideo,
    Folder,
    Pencil,
    Presentation,
    StickyNote,
    Trash2,
    RefreshCw,
    X
} from "lucide-react";

import type { TableItem as TableItemType, TransferPhase } from "../types";

function getFileIcon(item: TableItemType) {
    if (item.type === "folder") return Folder;
    if (item.type === "note") return StickyNote;

    const extension = item.extension.toLowerCase();

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"];
    const videoExtensions = ["mp4", "webm", "mov", "mkv", "avi", "m4v"];
    const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
    const compressedExtensions = ["zip", "rar", "7z", "tar", "gz"];
    const codeExtensions = [
        "js", "jsx", "ts", "tsx", "html", "css", "json", "xml",
        "py", "java", "php", "rb", "go", "rs", "cpp", "c", "cs"
    ];
    const spreadsheetExtensions = ["xls", "xlsx", "csv", "ods"];
    const presentationExtensions = ["ppt", "pptx", "key", "odp"];

    if (extension === "pdf") return FileText;
    if (imageExtensions.includes(extension)) return FileImage;
    if (videoExtensions.includes(extension)) return FileVideo;
    if (audioExtensions.includes(extension)) return FileAudio;
    if (compressedExtensions.includes(extension)) return Archive;
    if (codeExtensions.includes(extension)) return Code2;
    if (spreadsheetExtensions.includes(extension)) return FileSpreadsheet;
    if (presentationExtensions.includes(extension)) return Presentation;

    return FileText;
}

function getFileKindLabel(item: TableItemType) {
    if (item.type === "folder") return "Carpeta";
    if (item.type === "note") return "Nota de texto";

    const extension = item.extension.toLowerCase();

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"];
    const videoExtensions = ["mp4", "webm", "mov", "mkv", "avi", "m4v"];
    const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
    const compressedExtensions = ["zip", "rar", "7z", "tar", "gz"];
    const codeExtensions = [
        "js", "jsx", "ts", "tsx", "html", "css", "json", "xml",
        "py", "java", "php", "rb", "go", "rs", "cpp", "c", "cs"
    ];
    const spreadsheetExtensions = ["xls", "xlsx", "csv", "ods"];
    const presentationExtensions = ["ppt", "pptx", "key", "odp"];
    const documentExtensions = ["doc", "docx", "txt", "rtf", "odt"];

    if (extension === "pdf") return "PDF";
    if (imageExtensions.includes(extension)) return "Imagen";
    if (videoExtensions.includes(extension)) return "Video";
    if (audioExtensions.includes(extension)) return "Audio";
    if (compressedExtensions.includes(extension)) return "Comprimido";
    if (codeExtensions.includes(extension)) return "Código";
    if (spreadsheetExtensions.includes(extension)) return "Hoja de cálculo";
    if (presentationExtensions.includes(extension)) return "Presentación";
    if (documentExtensions.includes(extension)) return "Documento";

    return extension ? extension.toUpperCase() : "Archivo";
}

type Props = {
    item: TableItemType;

    onDownload: (
    item: TableItemType
) => void;

onPreview: (
    item: TableItemType
) => void;

    downloadProgress?: number;

    downloadComplete?: boolean;
    transferPhase?: TransferPhase;

    onMove: (
    item: TableItemType,
    x: number,
    y: number
) => void;
onCancelDownload: () => void;
scale?: number;
onOpenFolder: (id: string) => void;
selected?: boolean;
onSelect: (item: TableItemType) => void;
onDelete: (item: TableItemType) => void;
onRename: (item: TableItemType, name: string) => void;
canRelink?: boolean;
onRelink: (item: TableItemType) => void;
};



export default function TableItem({

    item,

    onDownload,

    onPreview,

    onMove,

    onCancelDownload,

    downloadProgress,

    downloadComplete = false,
    transferPhase = "idle",
    scale = 1,
    onOpenFolder,
    selected = false,
    onSelect,
    onDelete,
    onRename,
    canRelink = false,
    onRelink,

}: Props) {

    const [dragPosition, setDragPosition] =
    useState<{
        x: number;
        y: number;
    } | null>(null);
    const [editing, setEditing] = useState(false);
    const [draftName, setDraftName] = useState(item.name);

const dragRef = useRef<{
    startX: number;
    startY: number;
    itemX: number;
    itemY: number;
} | null>(null);

const movedRef = useRef(false);

    const Icon = getFileIcon(item);
    const fileKindLabel = getFileKindLabel(item);

    const downloading =
        downloadProgress !== undefined &&
        !downloadComplete;

    const transferLabel: Record<TransferPhase, string> = {
        idle: "",
        searching: "Buscando una copia…",
        connecting: "Conectando directamente…",
        receiving: "Recibiendo de forma segura…",
        verifying: "Verificando integridad…",
        complete: "Archivo verificado",
    };

    const radius = 18;

    const circumference =
        2 * Math.PI * radius;

    const offset =
        circumference -
        ((downloadProgress ?? 0) / 100) *
        circumference;

    const formattedSize =
    item.size >= 1024 * 1024
        ? `${(
              item.size /
              1024 /
              1024
          ).toFixed(1)} MB`
        : `${Math.max(
              1,
              Math.round(item.size / 1024)
          )} KB`;

    return (

       <div
    className={`table-item table-item--${item.type} ${
        downloading
            ? "table-item--downloading"
            : ""
    } ${
        downloadComplete
            ? "table-item--complete"
            : ""
    } ${
        dragPosition
            ? "table-item--dragging"
            : ""
    } ${selected ? "table-item--selected" : ""
    } table-item--phase-${transferPhase}`}
    style={{
    left: `${
        dragPosition?.x ??
        item.x
    }px`,

    top: `${
        dragPosition?.y ??
        item.y
    }px`,
}}
    onPointerDown={(event) => {

        if (downloading) return;

        event.currentTarget.setPointerCapture(
            event.pointerId
        );

        const workspace =
    event.currentTarget
        .offsetParent as HTMLElement | null;

const workspaceRect =
    workspace?.getBoundingClientRect();

if (!workspaceRect) return;

        dragRef.current = {
    startX: event.clientX,
    startY: event.clientY,
    itemX: item.x,
    itemY: item.y,
};

        movedRef.current = false;

    }}
    onPointerMove={(event) => {

        const drag =
            dragRef.current;

        if (!drag) return;

        const differenceX =
            event.clientX -
            drag.startX;

        const differenceY =
            event.clientY -
            drag.startY;

        if (
            Math.abs(differenceX) > 4 ||
            Math.abs(differenceY) > 4
        ) {

            movedRef.current = true;

        }

        if (!movedRef.current)
            return;

        const newX =
    drag.itemX +
    differenceX / scale;

const newY =
    drag.itemY +
    differenceY / scale;

setDragPosition({
    x: Math.max(
        0,
        Math.min(5000, newX)
    ),

    y: Math.max(
        0,
        Math.min(3400, newY)
    ),
});

    }}
    onPointerUp={(event) => {

        const finalPosition =
            dragPosition;

        dragRef.current = null;

        if (
            event.currentTarget.hasPointerCapture(
                event.pointerId
            )
        ) {

            event.currentTarget.releasePointerCapture(
                event.pointerId
            );

        }

        if (finalPosition) {

            onMove(
                item,
                finalPosition.x,
                finalPosition.y
            );

        }

        setDragPosition(null);

    }}
    onClick={() => {

        if (movedRef.current) {

            movedRef.current = false;

            return;

        }

        if (downloading) return;

        onSelect(item);

    }}
    onDoubleClick={() => {
    if (item.type === "folder") onOpenFolder(item.id);
    else if (canRelink) onRelink(item);
    else onPreview(item);
}}
>

            {selected && <div className="table-item-actions" onPointerDown={event => event.stopPropagation()}>
                {item.type === "file" && !canRelink && <button title="Descargar" onClick={event => { event.stopPropagation(); onDownload(item); }}><Download size={14}/></button>}
                {canRelink && <button title="Volver a vincular el archivo" onClick={event => { event.stopPropagation(); onRelink(item); }}><RefreshCw size={14}/></button>}
                <button title="Renombrar" onClick={event => { event.stopPropagation(); setEditing(true); }}><Pencil size={14}/></button>
                <button title="Mover a la papelera" onClick={event => { event.stopPropagation(); onDelete(item); }}><Trash2 size={14}/></button>
            </div>}

            <div className="table-item-icon">

                <Icon size={32} />

                {downloading && (

                    <div className="download-indicator">

                        <svg
                            viewBox="0 0 44 44"
                            className="download-ring"
                        >
                            <circle
                                className="download-ring-background"
                                cx="22"
                                cy="22"
                                r={radius}
                            />

                            <circle
                                className="download-ring-progress"
                                cx="22"
                                cy="22"
                                r={radius}
                                style={{
                                    strokeDasharray:
                                        circumference,
                                    strokeDashoffset:
                                        offset,
                                }}
                            />
                        </svg>

                        <span className="download-percentage">
    {downloadProgress}%
</span>

<button
    type="button"
    className="download-cancel"
    aria-label="Cancelar descarga"
    title="Cancelar descarga"
    onPointerDown={(event) => {

        event.stopPropagation();

    }}
    onClick={(event) => {

        event.stopPropagation();

        onCancelDownload();

    }}
>
    <X size={18} />
</button>

                    </div>

                )}

                {downloadComplete && (

                    <div className="download-complete">

                        <Check size={22} />

                    </div>

                )}

            </div>

            {editing ? <form className="table-item-rename" onSubmit={event => { event.preventDefault(); const name=draftName.trim(); if(name) onRename(item,name); setEditing(false); }}><input autoFocus value={draftName} onChange={event=>setDraftName(event.target.value)} onFocus={event=>event.currentTarget.select()} onBlur={()=>setEditing(false)}/></form> : <span className="table-item-name">{item.name}</span>}
            <div className="table-item-details">

    <span>
    {fileKindLabel}
    {item.type === "file" && item.extension ? ` · ${item.extension.toUpperCase()}` : ""}
    {" · "}
    {formattedSize}
</span>

    <span className="table-item-owner">

        Creado por {item.ownerName}

    </span>

</div>

            {item.type === "file" && !item.available && (
                <small className="table-item-state unavailable">
                    {canRelink ? "Vuelve a vincularlo" : "Fuente no disponible"}
                </small>
            )}

            {downloading && (

                <small className="table-item-state">

                    {transferLabel[transferPhase] || "Preparando descarga…"}

                </small>

            )}

            {downloadComplete && (

                <small className="table-item-state complete">

                    {transferLabel.complete}

                </small>

            )}

        </div>

    );

}
