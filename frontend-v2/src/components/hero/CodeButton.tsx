import { ArrowRight, ScanLine } from "lucide-react";

type Props = { onClick: () => void };

function CodeButton({ onClick }: Props) {
    return (
        <button className="action-card code-button" onClick={onClick}>
            <span className="action-icon"><ScanLine size={29} /></span>
            <span className="action-copy">
                <strong>Recibir</strong>
                <small>Ingresa el código de envío</small>
            </span>
            <ArrowRight className="action-arrow" size={21} />
        </button>
    );
}

export default CodeButton;
