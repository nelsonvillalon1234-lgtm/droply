type SidebarOverlayProps = {

    onClose: () => void;

};

function SidebarOverlay({

    onClose

}: SidebarOverlayProps) {

    return (

        <div

            className="sidebar-overlay"

            onClick={onClose}

        />

    );

}

export default SidebarOverlay;