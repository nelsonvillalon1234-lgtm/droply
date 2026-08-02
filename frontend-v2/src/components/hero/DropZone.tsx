import { useRef, useState } from "react";
import { ArrowRight, FileUp, Send } from "lucide-react";

type Props = { onFileSelected: (files: File[]) => void };

function DropZone({ onFileSelected }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const dragDepth = useRef(0);
    const [isDragging, setIsDragging] = useState(false);

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        onFileSelected(Array.from(files));
    }

    return (
        <div
            className={`action-card dropzone${isDragging ? " dropzone--active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
            }}
            onDragEnter={(event) => {
                event.preventDefault();
                dragDepth.current += 1;
                setIsDragging(true);
            }}
            onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
                event.preventDefault();
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) setIsDragging(false);
            }}
            onDrop={(event) => {
                event.preventDefault();
                dragDepth.current = 0;
                setIsDragging(false);
                handleFiles(event.dataTransfer.files);
            }}
        >
            <input ref={inputRef} type="file" multiple hidden onChange={(event) => handleFiles(event.target.files)} />
            <span className="action-icon"><Send size={29} /></span>
            <span className="action-copy">
                <strong>Enviar</strong>
                <small>Elige o arrastra uno o varios archivos</small>
            </span>
            <ArrowRight className="action-arrow" size={21} />
            <span className="dropzone-feedback" aria-hidden={!isDragging}>
                <span className="dropzone-feedback__rings" />
                <span className="dropzone-feedback__icon"><FileUp size={34} /></span>
                <strong>Suelta para enviar</strong>
                <small>Tu archivo irá directo al otro dispositivo</small>
            </span>
        </div>
    );
}

export default DropZone;
