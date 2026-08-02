import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import "./styles/header.css";
import "./styles/hero.css";
import "./styles/modal.css";

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

        <BrowserRouter>

            <App />

        </BrowserRouter>

    </React.StrictMode>
);
