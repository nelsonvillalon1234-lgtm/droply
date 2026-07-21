import { useState } from "react";

import FileDropzone from "../ui/FileDropzone";

type ConvertPanelProps = {

    file: File | null;

    setFile: React.Dispatch<
        React.SetStateAction<File | null>
    >;

};

function ConvertPanel({

    file,

    setFile

}: ConvertPanelProps) {

    const [format, setFormat] = useState("png");

    const convertImage = () => {

        if (!file) return;

        const image = new Image();

        image.onload = () => {

            const canvas =
                document.createElement("canvas");

            canvas.width = image.width;

            canvas.height = image.height;

            const ctx =
                canvas.getContext("2d");

            if (!ctx) return;

            ctx.drawImage(
                image,
                0,
                0
            );

            const mimeTypes = {

                png: "image/png",

                jpg: "image/jpeg",

                webp: "image/webp"

            };

            const converted = canvas.toDataURL(

                mimeTypes[
                    format as keyof typeof mimeTypes
                ]

            );

            const link =
                document.createElement("a");

            link.href = converted;

            link.download =
                `imagen-convertida.${format}`;

            link.click();

        };

        image.src =
            URL.createObjectURL(file);

    };

    return (

        <>

            {!file && (

                <FileDropzone

                    title="🖼️ Arrastra tu imagen"

                    subtitle="
                    o haz clic para seleccionarla
                    "

                    accept={{

                        "image/*": []

                    }}

                    onDrop={(files) => {

                        setFile(files[0]);

                    }}

                />

            )}

            {file && (

                <div className="pdf-viewer">

                    <div className="pdf-header">

                        <div className="pdf-info">

                            <h3>

                                {file.name}

                            </h3>

                            <p>

                                {(
                                    file.size / 1024
                                ).toFixed(0)}

                                {" "}KB

                            </p>

                        </div>

                    </div>

                    <div className="convert-content">

    <img
        src={URL.createObjectURL(file)}
        className="convert-preview"
        alt="preview"
    />

    <div className="convert-options">

        <h3>

            Convertir a

        </h3>

        <div className="convert-buttons">

            <button
                className={`
                    convert-format-button
                    ${format === "png" ? "active" : ""}
                `}
                onClick={() => setFormat("png")}
            >

                PNG

            </button>

            <button
                className={`
                    convert-format-button
                    ${format === "jpg" ? "active" : ""}
                `}
                onClick={() => setFormat("jpg")}
            >

                JPG

            </button>

            <button
                className={`
                    convert-format-button
                    ${format === "webp" ? "active" : ""}
                `}
                onClick={() => setFormat("webp")}
            >

                WEBP

            </button>

        </div>

    </div>

</div>

                    <div className="pdf-actions">

                        <button

                            className="pdf-button"

                            onClick={convertImage}

                        >

                            ✨ Convertir

                        </button>

                        <button

                            className="pdf-button secondary"

                            onClick={() => {

                                setFile(null);

                            }}

                        >

                            ↺ Cambiar imagen

                        </button>

                    </div>

                </div>

            )}

        </>

    );

}

export default ConvertPanel;