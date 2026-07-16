import ReceiveTransfer from "./ReceiveTransfer";

function JoinModal() {

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

                    showInput={true}

                />

            </div>

        </div>

    );

}

export default JoinModal;