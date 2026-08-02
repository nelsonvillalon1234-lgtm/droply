import { ArrowRight, LayoutGrid, LockKeyhole, Radio, Sparkles } from "lucide-react";
import DropZone from "./DropZone";
import CodeButton from "./CodeButton";

type Props = {
    onFileSelected: (file: File) => void;
    onEnterCode: () => void;
    onOpenSharedTable: () => void;
};

function Hero({ onFileSelected, onEnterCode, onOpenSharedTable }: Props) {
    return (
        <main className="hero">
            <section className="hero-intro">
                <span className="hero-eyebrow"><Sparkles size={15} /> Tus archivos, donde los necesitas</span>
                <h1 className="hero-title">¿Qué quieres hacer?</h1>
                <p className="hero-description">
                    Transfiere archivos directamente entre tus dispositivos o abre una mesa para trabajar en equipo.
                </p>
            </section>

            <section className="hero-actions" aria-label="Acciones principales">
                <DropZone onFileSelected={onFileSelected} />
                <CodeButton onClick={onEnterCode} />
                <button className="action-card action-card--table" onClick={onOpenSharedTable}>
                    <span className="action-icon"><LayoutGrid size={29} /></span>
                    <span className="action-copy">
                        <strong>Abrir una mesa</strong>
                        <small>Comparte con tu equipo</small>
                    </span>
                    <ArrowRight className="action-arrow" size={21} />
                </button>
            </section>

            <section className="trust-strip" aria-label="Privacidad de Droply">
                <div><Radio size={18} /><span><strong>Directo</strong> entre dispositivos</span></div>
                <div><LockKeyhole size={18} /><span><strong>Privado</strong> sin guardar tus archivos</span></div>
            </section>
        </main>
    );
}

export default Hero;
