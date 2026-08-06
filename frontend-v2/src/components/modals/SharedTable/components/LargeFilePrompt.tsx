import { AlertTriangle, Download, X } from "lucide-react";
import type { TableItem } from "../types";
import "../styles/largeFilePrompt.css";

type Props = {
    item: TableItem | null;
    onConfirm: () => void;
    onCancel: () => void;
};

function formatPromptSize(size: number) {
    if (size >= 1024 * 1024 * 1024) {
        return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    if (size >= 1024 * 1024) {
        return `${(size / 1024 / 1024).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function LargeFilePrompt({
    item,
    onConfirm,
    onCancel,
}: Props) {
    if (!item || item.type !== "file") return null;

    const isHuge = item.size >= 2 * 1024 * 1024 * 1024;
    const formattedSize = formatPromptSize(item.size);

    return (
        <div className="large-file-prompt-backdrop" onClick={onCancel}>
            <section
                className="large-file-prompt"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="large-file-prompt-close"
                    onClick={onCancel}
                    aria-label="Cerrar aviso"
                    title="Cerrar"
                >
                    <X size={18} />
                </button>

                <div className="large-file-prompt-icon">
                    <AlertTriangle size={26} />
                </div>

                <div className="large-file-prompt-copy">
                    <span className="large-file-prompt-eyebrow">
                        Archivo grande
                    </span>

                    <h3>
                        Este archivo pesa <strong>{formattedSize}</strong>
                    </h3>

                    <p>
                        {isHuge
                            ? "Es un archivo muy grande. En esta beta puede consumir bastante memoria RAM mientras se recibe."
                            : "Los archivos grandes pueden consumir bastante memoria mientras se descargan en esta beta."}
                    </p>

                    <div className="large-file-prompt-note">
                        <strong>Recomendación:</strong>
                        <span>
                            cierra programas pesados antes de continuar para
                            evitar que el navegador se sature.
                        </span>
                    </div>
                </div>

                <footer className="large-file-prompt-actions">
                    <button
                        type="button"
                        className="large-file-prompt-secondary"
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className="large-file-prompt-primary"
                        onClick={onConfirm}
                    >
                        <Download size={16} />
                        Descargar igual
                    </button>
                </footer>
            </section>
        </div>
    );
}