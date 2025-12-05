import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import './lib/i18n'; // Import i18n configuration
import { I18nextProvider } from 'react-i18next';
import i18n from './lib/i18n';

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>
);