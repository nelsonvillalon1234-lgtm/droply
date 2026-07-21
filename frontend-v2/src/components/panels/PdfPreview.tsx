import { useState } from "react";

type PdfPreviewProps = {
    file: File | null;
};

function PdfPreview({ file }: PdfPreviewProps) {

    if (!file) {

        return (
            <p>No hay PDF seleccionado.</p>
        );

    }

    return (

        <div className="pdf-preview">

            <h3>{file.name}</h3>

            <p>
                {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>

            <iframe
                src={URL.createObjectURL(file)}
                width="100%"
                height="600"
            />

        </div>

    );

}

export default PdfPreview;