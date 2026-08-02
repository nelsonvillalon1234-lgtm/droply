type HistoryItem = {

    id: string;

    type: "compress" | "merge" | "convert" | "sign";

    title: string;

    description: string;

    date: string;

};

type HistoryPanelProps = {

    history: HistoryItem[];

    setHistory: React.Dispatch<
        React.SetStateAction<
            HistoryItem[]
        >
    >;

};

function HistoryPanel({

    history,

    setHistory

}: HistoryPanelProps) {

    return (

        

        <div className="pdf-viewer">

            <div className="history-header">

    <div className="history-info">

        

        <h3>

            Historial

        </h3>

        <p>

            {history.length} elementos

        </p>

    </div>

    {history.length > 0 && (

    <button
        className="
            pdf-button
            secondary
        "
        onClick={() => {

            if (

                confirm(

                    "¿Borrar todo el historial?"

                )

            ) {

                setHistory([]);

            }

        }}
    >

        🗑️ Limpiar

    </button>

)}


</div>

            {

                history.length === 0 && (

                    <div className="empty-history">

                        <h3>

                            Todavía no hay actividad

                        </h3>

                        <p>

                            Las compresiones,
                            conversiones y PDFs
                            aparecerán aquí.

                        </p>

                    </div>

                )

            }

            {

                history.length > 0 && (

                    <div className="merge-files-list">

                        {

                            history.map(

                                (item) => (

                                    <div

                                        key={item.id}

                                        className="merge-file-card"

                                    >

                                        <div>

                                            {

                                                item.type === "compress"

                                                    ? "📦"

                                                    : item.type === "merge"

                                                    ? "📄"

                                                    : item.type === "convert"

                                                    ? "🖼️"

                                                    : "✍️"

                                            }

                                            {" "}

                                            {item.title}

                                        </div>

                                        <div className="history-meta">

    <span>

        {item.description}

    </span>

    <span>

        {" • "}

    </span>

    <span>

        {item.date}

    </span>

</div>

                                    </div>

                                )

                            )

                        }

                    </div>

                )

            }

        </div>

    );

}

export default HistoryPanel;