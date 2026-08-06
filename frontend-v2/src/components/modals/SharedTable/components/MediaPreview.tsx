import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import "./../styles/mediaPreview.css";

export type MediaPreviewFile = {
    itemId: string;
    url: string;
    name: string;
    extension: string;
    mimeType: string;
    kind: "image" | "video" | "audio" | "pdf";
};

type Props = {
    preview: MediaPreviewFile;
    onClose: () => void;
    onPrevious?: () => void;
    onNext?: () => void;
    canGoPrevious?: boolean;
    canGoNext?: boolean;
};

export default function MediaPreview({
    preview,
    onClose,
    onPrevious,
    onNext,
    canGoPrevious = false,
    canGoNext = false,
}: Props) {

    return (
        <div className="media-preview-backdrop" onClick={onClose}>
            <section
                className={`media-preview media-preview--${preview.kind}`}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="media-preview-header">
                    <div>
                        <strong>{preview.name}</strong>
                        <small>{preview.extension.toUpperCase()}</small>
                    </div>

                    <div className="media-preview-actions">
                        <a
                            href={preview.url}
                            download={preview.name}
                            title="Descargar"
                        >
                            <Download size={18} />
                        </a>

                        <button onClick={onClose} title="Cerrar">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="media-preview-content">
                    {canGoPrevious && (
    <button
        className="media-preview-nav media-preview-nav--left"
        onClick={onPrevious}
        title="Anterior"
    >
        <ChevronLeft size={26} />
    </button>
)}

{canGoNext && (
    <button
        className="media-preview-nav media-preview-nav--right"
        onClick={onNext}
        title="Siguiente"
    >
        <ChevronRight size={26} />
    </button>
)}


                    {preview.kind === "image" && (
                        <img src={preview.url} alt={preview.name} />
                    )}

                    {preview.kind === "video" && (
                        <video src={preview.url} controls autoPlay />
                    )}

                    {preview.kind === "audio" && (
                        <div className="media-preview-audio">
                            <div className="media-preview-disc">
                                <span />
                            </div>

                            <strong>{preview.name}</strong>

                            <audio src={preview.url} controls autoPlay />
                        </div>
                    )}

                    {preview.kind === "pdf" && (
                        <iframe src={preview.url} title={preview.name} />
                    )}
                </div>
            </section>
        </div>
    );
}