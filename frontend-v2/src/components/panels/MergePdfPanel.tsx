import {useEffect,useState} from "react";
import FileDropzone from "../ui/FileDropzone";
import SortableFileCard from "./SortableFileCard";
import {
    DndContext,
    closestCenter
} from "@dnd-kit/core";

import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove
} from "@dnd-kit/sortable";

type HistoryItem = {

    id: string;

    type: "compress" | "merge" | "convert" | "sign";

    title: string;

    description: string;

    date: string;

};

type MergePdfPanelProps = {

    files: File[];

    setFiles: React.Dispatch<
        React.SetStateAction<File[]>
    >;

    setHistory: React.Dispatch<
        React.SetStateAction<
            HistoryItem[]
        >
    >;

};
function MergePdfPanel({

    files,

    setFiles,

    setHistory

}: MergePdfPanelProps) {

    
    
    const [pageCounts, setPageCounts] = useState<
    Record<string, number>
>({});

useEffect(() => {

    setPageCounts((current) => {

        const updated = {

            ...current

        };

        Object.keys(updated).forEach(

            (fileName) => {

                const exists =
                    files.some(

                        (file) =>

                            file.name ===
                            fileName

                    );

                if (!exists) {

                    delete updated[
                        fileName
                    ];

                }

            }

        );

        return updated;

    });

}, [files]);

    const loadPageCounts = async (
    pdfFiles: File[]
) => {

    const { PDFDocument } = await import(
        "pdf-lib"
    );

    const counts: Record<
        string,
        number
    > = {};

    for (const file of pdfFiles) {

        const bytes =
            await file.arrayBuffer();

        const pdf =
            await PDFDocument.load(
                bytes
            );

        counts[file.name] =
            pdf.getPageCount();

    }

    setPageCounts(counts);

};

//AQUI YA NO TOCAR

    const [isMerging, setIsMerging] = useState(false);

    const handleDragEnd = (event: any) => {

    const {

        active,

        over

    } = event;

    if (

        !over ||

        active.id === over.id

    ) {

        return;

    }

    const oldIndex = files.findIndex(

    (file, index) =>

        `${file.name}-${index}` === active.id

);

const newIndex = files.findIndex(

    (file, index) =>

        `${file.name}-${index}` === over.id

);

    setFiles(

        arrayMove(

            files,

            oldIndex,

            newIndex

        )

    );

};

    const mergePdfs = async () => {

        if (files.length < 2) {

    alert(
        "Selecciona al menos 2 PDFs."
    );

    return;

}

setIsMerging(true);

        const { PDFDocument } = await import(
            "pdf-lib"
        );

        const mergedPdf =
            await PDFDocument.create();

        for (const file of files) {

            const bytes =
                await file.arrayBuffer();

            const pdf =
                await PDFDocument.load(
                    bytes
                );

            const pages =
                await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices()
                );

            pages.forEach((page) => {

                mergedPdf.addPage(page);

            });

        }

        const mergedBytes =
            await mergedPdf.save();

       const blob = new Blob(

    [new Uint8Array(mergedBytes)],

    {

        type: "application/pdf"

    }

);

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "documentos-unidos.pdf";

            setTimeout(() => {

                setHistory((current) => [

    {

        id: crypto.randomUUID(),

        type: "merge",

        title: "documentos-unidos.pdf",

        description:

            `${files.length} PDFs • ${Object.values(pageCounts).reduce(

                (total, pages) =>

                    total + pages,

                0

            )} páginas`,

        date:

            new Date()

                .toLocaleString()

    },

    ...current

]);

    setIsMerging(false);

}, 1000);

        link.click();

        URL.revokeObjectURL(url);

    };

    return (

    <>

       {files.length === 0 && (

    <FileDropzone

        title="📄 Arrastra tus PDFs"

        subtitle="
        o haz clic para seleccionarlos
        "

        multiple={true}

        accept={{

            "application/pdf": [
                ".pdf"
            ]

        }}

        onDrop={async (
    acceptedFiles
) => {

    setFiles(
        acceptedFiles
    );

    await loadPageCounts(
        acceptedFiles
    );

}}

    />

)}

        {files.length > 0 && (

            <div className="pdf-viewer">

                <div className="pdf-header">

                    <div className="pdf-info">

                        <h3>

                            {files.length}
                            {" "}
                            archivos seleccionados

                        </h3>

                        <p>

    {

        Object.values(pageCounts)
            .reduce(
                (total, pages) =>
                    total + pages,
                0
            )

    }

    {" "}páginas en total

</p>

                    </div>

                </div>

                <DndContext
    collisionDetection={closestCenter}
    onDragEnd={handleDragEnd}
>

    <SortableContext
        items={files.map(

    (file, index) =>

        `${file.name}-${index}`

)}
        strategy={
            verticalListSortingStrategy
        }
    >

        <div className="merge-files-list">

            {

                files.map(

                    (file, index) => (

        <SortableFileCard
            key={file.name}
              file={file}
                index={index}
                    files={files}
                      setFiles={setFiles}
                        pageCounts={pageCounts}
/>

                    )

                )

            }

        </div>

    </SortableContext>

</DndContext>

                <div className="pdf-actions">

    {

        isMerging ? (

            <div className="merge-loading">

                <div className="merge-spinner" />

                <p>

                    Uniendo documentos...

                </p>

            </div>

        ) : (

            <>

                <button
                    className="pdf-button"
                    onClick={mergePdfs}
                >

                    ✨ Unir PDFs

                </button>

                <button
                    className="
                        pdf-button
                        secondary
                    "
                    onClick={() => {

                        setFiles([]);

                    }}
                >

                    ↺ Reemplazar PDFs

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

export default MergePdfPanel;