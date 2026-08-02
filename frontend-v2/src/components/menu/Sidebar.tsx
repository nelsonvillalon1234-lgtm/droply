import { Archive, FileArchive, FileImage, FilePenLine, Files, History } from "lucide-react";

type SidebarProps = { setActivePanel: (panel: string) => void };

function Sidebar({ setActivePanel }: SidebarProps) {
    return (
        <aside className="sidebar">
            <div className="sidebar-heading"><span>Herramientas</span></div>
            <div className="sidebar-section">
                <h2>Documentos</h2>
                <p>Acciones rápidas, ejecutadas en tu dispositivo.</p>
                <ul>
                    <li onClick={() => setActivePanel("Firmar PDF")}><FilePenLine size={19} /> Firmar PDF</li>
                    <li onClick={() => setActivePanel("Unir PDF")}><Files size={19} /> Unir PDF</li>
                    <li onClick={() => setActivePanel("Convertir imágenes")}><FileImage size={19} /> Convertir imágenes</li>
                    <li onClick={() => setActivePanel("Comprimir archivos")}><FileArchive size={19} /> Comprimir archivos</li>
                </ul>
            </div>
            <div className="sidebar-section">
                <h2>Tu actividad</h2>
                <ul>
                    <li onClick={() => setActivePanel("Historial")}><History size={19} /> Historial</li>
                    <li onClick={() => setActivePanel("Dispositivos vinculados")}><Archive size={19} /> Dispositivos vinculados</li>
                </ul>
            </div>
        </aside>
    );
}

export default Sidebar;
