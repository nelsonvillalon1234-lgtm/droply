import { useDropzone } from "react-dropzone";

type FileDropzoneProps = {
    title: string;
    subtitle: string;
    multiple?: boolean;
    accept: Record<string, string[]>;
    onDrop: (files: File[]) => void;
};

function FileDropzone({
    title,
    subtitle,
    multiple = false,
    accept,
    onDrop
}: FileDropzoneProps) {

    const {
        getRootProps,
        getInputProps,
        isDragActive
    } = useDropzone({

        accept,

        multiple,

        onDrop

    });

    return (

        <div
            className={`
                panel-dropzone
                ${isDragActive
                    ? "dropzone-active"
                    : ""}
            `}
            {...getRootProps()}
        >

            <input
    {...getInputProps() as any}
/>

            <h2>

                {title}

            </h2>

            <p>

                {subtitle}

            </p>

        </div>

    );

}

export default FileDropzone;