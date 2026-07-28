import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Parqview from "./Parqview";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Parqview root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <Parqview />
  </StrictMode>,
);
