import { defineConfig } from "vite";
import * as path from "path";


export default defineConfig({
    server: {
        port: 5173,
        host: true
    },
    preview: {
        port: 5173,
        host: true
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    }
});