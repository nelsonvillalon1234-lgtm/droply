import { useEffect, useRef, useState } from "react";

import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import SignatureCanvas from "react-signature-canvas";
import FileDropzone from "../ui/FileDropzone";

type PdfPanelProps = {

    file: File | null;

    setFile: React.Dispatch<
        React.SetStateAction<File | null>
    >;

};

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

function PdfPanel({

    file,

    setFile

}: PdfPanelProps) {

const [showSignatureModal, setShowSignatureModal] = useState(false);
const [signature, setSignature] = useState<string | null>(null);

const pageRef = useRef<HTMLDivElement | null>(null);

const [signaturePosition, setSignaturePosition] = useState({

    x: 300,

    y: 300

});
const [signatureSize, setSignatureSize] = useState({

    width: 0,

    height: 0

});
const [dragging, setDragging] = useState(false);
const signatureRef = useRef<SignatureCanvas | null>(null);

    const [width, setWidth] = useState(700);
    const downloadSignedPdf = async () => {

    if (!file || !signature) {

        return;

    }

    const { PDFDocument } = await import("pdf-lib");

    const bytes = await file.arrayBuffer();

    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();

    const firstPage = pages[0];

 const pngImage = await pdfDoc.embedPng(signature);

const pdfWidth = firstPage.getWidth();

const pdfHeight = firstPage.getHeight();

const canvas = document.querySelector(
    ".react-pdf__Page canvas"
) as HTMLCanvasElement | null;

if (!canvas) {

    return;

}

const rect = canvas.getBoundingClientRect();

console.log({

    canvasRect: canvas.getBoundingClientRect(),

    wrapperRect: pageRef.current?.getBoundingClientRect()

});

const renderedWidth = rect.width;

const renderedHeight = rect.height;




    console.log({

    pdfWidth,

    pdfHeight,

    renderedWidth,

    renderedHeight,

    signaturePosition

});

const scaleX = pdfWidth / renderedWidth;

const scaleY = pdfHeight / renderedHeight;

const pdfSignatureWidth =
    signatureSize.width * scaleX;

const pngDims = pngImage.scale(
    pdfSignatureWidth / pngImage.width
);


console.log({
    position: signaturePosition,
    scaleX,
    scaleY,
    pngWidth: pngDims.width,
    pngHeight: pngDims.height
});
firstPage.drawImage(
    pngImage,
    {
        x:
            (
                signaturePosition.x -
                pngDims.width / 2
            ) * scaleX,

        y:
            pdfHeight -
            (
                signaturePosition.y -
                pngDims.height / 2
            ) * scaleY -
            pngDims.height,

        width: pngDims.width,

        height: pngDims.height
    }
);

    const signedPdf = await pdfDoc.save();

const blob = new Blob(

    [new Uint8Array(signedPdf)],

    {

        type: "application/pdf"

    }

);

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = file.name.replace(

        ".pdf",

        "-firmado.pdf"

    );

    link.click();

    URL.revokeObjectURL(url);

};

useEffect(() => {

    const updateWidth = () => {

        const screenWidth = window.innerWidth;

        if (screenWidth < 1200) {

            setWidth(500);

        } else {

            setWidth(700);

        }

    };

    updateWidth();

    window.addEventListener(
        "resize",
        updateWidth
    );
    

    return () => {

        window.removeEventListener(
            "resize",
            updateWidth
        );

    };

    
}



, []);
useEffect(() => {

    const handleMouseMove = (event: MouseEvent) => {

        if (!dragging) return;

        const canvas = document.querySelector(
            ".react-pdf__Page canvas"
        ) as HTMLCanvasElement | null;

        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        const x = event.clientX - rect.left;

        const y = event.clientY - rect.top;

        setSignaturePosition({

    x,

    y

});

    };

    const handleMouseUp = () => {

        setDragging(false);

    };

    window.addEventListener(
        "mousemove",
        handleMouseMove
    );

    window.addEventListener(
        "mouseup",
        handleMouseUp
    );

    return () => {

        window.removeEventListener(
            "mousemove",
            handleMouseMove
        );

        window.removeEventListener(
            "mouseup",
            handleMouseUp
        );

    };

}, [dragging, signatureSize]);


    return (

        <>

            <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                hidden
                onChange={(e) => {

                    const selectedFile = e.target.files?.[0];

                    if (selectedFile) {

                        setFile(selectedFile);

                    }

                }}
            />

           {!file && (

    <FileDropzone
        title="📂 Arrastra un PDF"
        subtitle="o haz clic para seleccionarlo."
        accept={{
            "application/pdf": [".pdf"]
        }}
        onDrop={(files) => {

            if (files.length > 0) {

                setFile(files[0]);

            }

        }}
    />

)}

               

            {file && (

                <div className="pdf-viewer"
             >


                    <div className="pdf-header">

    <div className="pdf-info">

        <h3>

            {file.name}

        </h3>

        <p>

            {(file.size / 1024).toFixed(0)} KB

        </p>

    </div>

</div>

             <div className="pdf-page-container">

    <div
        className="pdf-canvas-wrapper"
        ref={pageRef}
    >

        <Document file={file}>

            <Page
                pageNumber={1}
                width={width}
            />

        </Document>

        {signature && (

            <img
    draggable={false}
    src={signature}
    className="signature-preview"
    alt="Firma"
    style={{

        
    left:
        signaturePosition.x -
        signatureSize.width / 2,

    top:
        signaturePosition.y -
        signatureSize.height / 2,

    width:
        signatureSize.width,

    height:
        signatureSize.height

}}
    onMouseDown={(e) => {

        e.preventDefault();

        setDragging(true);

    }}
/>

        )}

    </div>

</div>

                    <div className="pdf-actions">

    <button
    className="pdf-button"
    onClick={() => {

        setShowSignatureModal(true);

    }}
>

    ✏️ Firmar

</button>

    <button
        className="pdf-button secondary"
        onClick={() => {

            setFile(null);

        }}
    >

        ↺ Reemplazar PDF

    </button>

    <button
    className="pdf-button download"
    onClick={downloadSignedPdf}
>

    ↓ Descargar PDF

</button>

</div>

                </div>

            )}

                {showSignatureModal && (

    <div
        className="signature-overlay"
        onClick={() => {

            setShowSignatureModal(false);

        }}
    >

        <div
            className="signature-modal"
            onClick={(e) => {

                e.stopPropagation();

            }}
        >

            <h2>

                Crear firma

            </h2>

            <div className="signature-canvas">

    <SignatureCanvas
        ref={signatureRef}
        penColor="black"
        canvasProps={{
            width: 620,
            height: 280,
            className: "signature-pad"
        }}
    />

</div>

            <div className="signature-actions">

                <button
    className="pdf-button secondary"
    onClick={() => {

        signatureRef.current?.clear();

    }}
>

    Limpiar

</button>

               <button
    className="pdf-button"
    onClick={() => {

        const image = signatureRef
    .current
    ?.toDataURL();

if (image) {

    const img = new Image();

    img.onload = () => {

        const previewWidth = 180;

        const ratio =
            img.height / img.width;

        setSignatureSize({

            width: previewWidth,

            height:
                previewWidth * ratio

        });
        console.log({

    originalWidth: img.width,

    originalHeight: img.height

});

        setSignature(image);

        setShowSignatureModal(false);

    };

    img.src = image;

}
    }}
>

    Guardar firma

</button>

            </div>

        </div>

    </div>

)}

        </>

    );

}

export default PdfPanel;