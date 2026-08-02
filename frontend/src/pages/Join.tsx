import { useParams } from "react-router-dom";

import ReceiveTransfer from "../components/ReceiveTransfer";

import "../styles/modal.css";

function Join() {

    const { code } = useParams();

    return (

        <div className="modal-overlay">

            <div className="join-modal">

                <h2>

                    Unirse a Socket

                </h2>

                <p>

                    Introduce el código compartido.

                </p>

                <ReceiveTransfer

                    initialCode={code ?? ""}

                />

            </div>

        </div>

    );

}

export default Join;