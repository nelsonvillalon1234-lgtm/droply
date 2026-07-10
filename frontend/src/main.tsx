import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import "./index.css";

import Home from "./pages/Home";
import Join from "./pages/Join";

ReactDOM.createRoot(document.getElementById("root")!).render(

  <React.StrictMode>

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

       <Route
    path="/join"
    element={<Join />}
/>

<Route
    path="/join/:code"
    element={<Join />}
/>

      </Routes>

    </BrowserRouter>

  </React.StrictMode>

);