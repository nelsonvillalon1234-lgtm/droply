import DropZone from "./DropZone";
import CodeButton from "./CodeButton";

function Hero() {
    return (
        <section className="hero">

            <div className="hero-left">

                <DropZone />

                <CodeButton />

            </div>

            <div className="hero-right">

                <h1 className="hero-title">

                    La distancia ya
                    <br />
                    no importa.

                </h1>

                <p className="hero-description">

                    Envía archivos entre dispositivos
                    de forma rápida, privada y sin límites.

                </p>

            </div>

        </section>
    );
}

export default Hero;