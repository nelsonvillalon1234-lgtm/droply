import { useEffect, useState } from "react";

import HistoryManager from "../core/HistoryManager";

import "../styles/history.css";

function HistoryPanel() {

    const [items, setItems] = useState(

        HistoryManager.getAll()

    );

    useEffect(() => {

        const interval = setInterval(() => {

            setItems(

                HistoryManager.getAll()

            );

        }, 1000);

        return () => {

            clearInterval(interval);

        };

    }, []);

    function formatDate(timestamp: number) {

        return new Date(

            timestamp

        ).toLocaleString();

    }

    return (

        <div className="clipboard-panel">

            <h2>

                🕘 Historial

            </h2>

            {

                items.length === 0 && (

                    <p>

                        No hay elementos.

                    </p>

                )

            }

            {

                items.map(item => (

                    <div

                        key={item.id}

                        className="history-item"

                    >

                        <div>

                            {

                                item.type === "file"

                                    ? "📄"

                                    : "📋"

                            }

                            {" "}

                            {item.name}

                        </div>

                        <small>

                            {

                                formatDate(

                                    item.date

                                )

                            }

                        </small>

                    </div>

                ))

            }

        </div>

    );

}

export default HistoryPanel;