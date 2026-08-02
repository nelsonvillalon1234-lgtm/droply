import { useSortable } from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

type SortableFileCardProps = {

    file: File;

    index: number;

    files: File[];

    setFiles: React.Dispatch<
        React.SetStateAction<File[]>
    >;

    pageCounts: Record<
        string,
        number
    >;

};

function SortableFileCard({

    file,
    index,
    files,
    setFiles,
    pageCounts

}: SortableFileCardProps) {

    const {

    attributes,

    listeners,

    setNodeRef,

    transform,

    transition

} = useSortable({

    id: `${file.name}-${index}`

});
    const style = {

        transform: CSS.Transform.toString(

            transform

        ),

        transition

    };

    return (

       <div
    ref={setNodeRef}
    style={style}
    className="merge-file-card"
>
    <div
    className="drag-handle"
    {...attributes}
    {...listeners}
>

    ☰

</div>

            <div className="merge-file-info">

                <div>

                    📄 {file.name}

                </div>

                <span>

    {(file.size / 1024).toFixed(0)}

    {" "}KB

    {" • "}

    {

        pageCounts[file.name]

    }

    {" páginas"}

</span>

            </div>

            <div className="merge-file-actions">

                <button
                    onClick={(e) => {

                        e.stopPropagation();

                        if (index === 0) {

                            return;

                        }

                        const newFiles = [

                            ...files

                        ];

                        [

                            newFiles[index - 1],

                            newFiles[index]

                        ] = [

                            newFiles[index],

                            newFiles[index - 1]

                        ];

                        setFiles(

                            newFiles

                        );

                    }}
                >

                    ↑

                </button>

                <button
                    onClick={(e) => {

                        e.stopPropagation();

                        if (

                            index ===
                            files.length - 1

                        ) {

                            return;

                        }

                        const newFiles = [

                            ...files

                        ];

                        [

                            newFiles[index + 1],

                            newFiles[index]

                        ] = [

                            newFiles[index],

                            newFiles[index + 1]

                        ];

                        setFiles(

                            newFiles

                        );

                    }}
                >

                    ↓

                </button>

                <button
                    onClick={(e) => {

                        e.stopPropagation();

                        setFiles(

                            files.filter(

                                (_, i) =>

                                    i !== index

                            )

                        );

                    }}
                >

                    ✕

                </button>

            </div>

        </div>

    );

}

export default SortableFileCard;