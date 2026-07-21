type HeaderProps = {

    menuOpen: boolean;

    setMenuOpen: () => void;

};

function Header({

    menuOpen,

    setMenuOpen

}: HeaderProps) {

    return (

        <header className="header">

         <button

    className="logo-button"

    onClick={setMenuOpen}

>

    <img

        src="/socket-logo.png"

        alt="Socket"

        className="logo-image"

    />

</button>
            {
    !menuOpen && (

        <div className={`auth-buttons ${menuOpen ? "hidden" : ""}`}>

            <button className="login-button">

                Iniciar sesión

            </button>

            <button className="register-button">

                Registrarse

            </button>

        </div>

    )
}

        </header>

    );

}

export default Header;