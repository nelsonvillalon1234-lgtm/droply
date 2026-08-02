import {
    ArrowUp,
    Check,
    LoaderCircle
} from "lucide-react";

import "./../styles/footer.css";

type Props = {

    connected: boolean;

    progress: number;

    onSend: () => void;

};

export default function Footer({

    connected,

    progress,

    onSend,

}: Props) {

    const completed = progress >= 100;

    const sending =
        progress > 0 &&
        progress < 100;

    return (

        <div className="transfer-footer">

            {

                !sending &&
                !completed && (

                    <button

                        className="send-button"

                        disabled={!connected}

                        onClick={onSend}

                    >

                        <ArrowUp size={18}/>

                        <span>

                            {

                                connected

                                    ? "Enviar archivo"

                                    : "Esperando dispositivo..."

                            }

                        </span>

                    </button>

                )

            }

            {

                sending && (

                    <div className="footer-status">

                        <LoaderCircle
                            className="footer-spin"
                            size={18}
                        />

                        <span>

                            Enviando archivo...

                        </span>

                    </div>

                )

            }

            {

                completed && (

                    <div className="footer-success">

                        <Check size={18}/>

                        <span>

                            Transferencia completada

                        </span>

                    </div>

                )

            }

        </div>

    );

}