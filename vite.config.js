import { defineConfig } from "vite";
import { renderPage } from "./src/render/page.js";

export default defineConfig({
  // Relative URLs, so the site works at kynjii.github.io/release-day-sick-note/ and locally.
  base: "./",
  plugins: [
    {
      name: "render-page",
      transformIndexHtml: { order: "pre", handler: html => renderPage(html) },
    },
  ],
});
