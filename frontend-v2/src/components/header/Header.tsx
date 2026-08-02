import { Menu, Wrench } from "lucide-react";

type HeaderProps = {
    menuOpen: boolean;
    setMenuOpen: () => void;
};

function Header({ menuOpen, setMenuOpen }: HeaderProps) {
    return (
        <header className="header">
            <button className="brand-button" onClick={setMenuOpen} aria-label="Abrir herramientas">
                <span className="brand-mark">
                    <img src="/socket-logo.png" alt="" className="logo-image" />
                </span>
                <span className="brand-name">Droply</span>
            </button>

            <button className={`tools-button ${menuOpen ? "is-open" : ""}`} onClick={setMenuOpen}>
                {menuOpen ? <Menu size={20} /> : <Wrench size={19} />}
                <span>Herramientas</span>
            </button>
        </header>
    );
}

export default Header;
