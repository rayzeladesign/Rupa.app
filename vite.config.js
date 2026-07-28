import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path HARUS sama dengan nama repo GitHub kamu, karena diakses lewat
// https://rayzeladesign.github.io/Rupa.app/
export default defineConfig({
  plugins: [react()],
  base: "/Rupa.app/",
});
