type SidebarProps = {

    setActivePanel: (
        panel: string
    ) => void;

};

function Sidebar({

    setActivePanel

}: SidebarProps) {

    return (

        <aside className="sidebar">

            <div className="sidebar-section">

                <h2>

                    Socket Tools

                </h2>

                <p>

                    Herramientas rápidas para tus archivos.

                </p>

                <ul>

                    <li
                        onClick={() =>

                            setActivePanel(
                                "Firmar PDF"
                            )

                        }
                    >

                        Firmar PDF

                    </li>

                    <li
                        onClick={() =>

                            setActivePanel(
                                "Unir PDF"
                            )

                        }
                    >

                        Unir PDF

                    </li>

                    <li
                        onClick={() =>

                            setActivePanel(
                                "Convertir imágenes"
                            )

                        }
                    >

                        Convertir imágenes

                    </li>

                    <li
                        onClick={() =>

                            setActivePanel(
                                "Comprimir archivos"
                            )

                        }
                    >

                        Comprimir archivos

                    </li>

                </ul>

            </div>

            <div className="sidebar-section">

                <h2>

                    Transferencias

                </h2>

                <ul>

                    <li
                        onClick={() =>

                            setActivePanel(
                                "Historial"
                            )

                        }
                    >

                        Historial

                    </li>

                    <li
                        onClick={() =>

                            setActivePanel(
                                "Dispositivos vinculados"
                            )

                        }
                    >

                        Dispositivos vinculados

                    </li>

                    <li
                        onClick={() =>

                            setActivePanel(
                                "Descargas recientes"
                            )

                        }
                    >

                        Descargas recientes

                    </li>

                </ul>

            </div>

        </aside>

    );
}

export default Sidebar;