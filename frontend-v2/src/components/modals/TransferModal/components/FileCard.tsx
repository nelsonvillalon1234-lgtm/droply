import {
    FileArchive,
    FileText,
    ImageIcon,
    Film,
    Music,
} from "lucide-react";

import "./../styles/fileCard.css";

type Props = {
    file?: File | null;
    fileName?: string;
    fileSize?: number;
};

export default function FileCard({

    file,

    fileName,

    fileSize,

}: Props) {

    if (!file && !fileName) return null;

    const formatSize = (bytes: number) => {

        if (bytes < 1024) return `${bytes} B`;

        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(2)} KB`;

        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / 1024 / 1024).toFixed(2)} MB`;

        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;

    };

    const name = file?.name ?? fileName ?? "";

    const size = file?.size ?? fileSize ?? 0;

    const extension =
        name.split(".").pop()?.toLowerCase();

    const getIcon = () => {

        if (!extension)
            return <FileText size={28} />;

        if (
            ["png", "jpg", "jpeg", "gif", "webp"].includes(extension)
        )
            return <ImageIcon size={28} />;

        if (
            ["mp4", "mov", "avi", "mkv"].includes(extension)
        )
            return <Film size={28} />;

        if (
            ["mp3", "wav", "ogg"].includes(extension)
        )
            return <Music size={28} />;

        if (
            ["zip", "rar", "7z"].includes(extension)
        )
            return <FileArchive size={28} />;

        return <FileText size={28} />;

    };

    return (

        <div className="file-card">

            <div className="file-icon">

                {getIcon()}

            </div>

            <div className="file-info">

                <h3>{name}</h3>

                <span>

                    {size > 0 && formatSize(size)}

                    {size > 0 && extension && " • "}

                    {extension?.toUpperCase()}

                </span>

            </div>

        </div>

    );

}