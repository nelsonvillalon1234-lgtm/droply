import React from "react";
import ReactDOM from "react-dom/client";

import "./styles/header.css";
import "./styles/hero.css";

import App from "./App.tsx";

import "./styles/globals.css";
import "./styles/header.css";
import "./styles/hero.css";
import "./styles/menu.css";
import "./styles/panels.css";

ReactDOM.createRoot(
    document.getElementById("root")!
).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);