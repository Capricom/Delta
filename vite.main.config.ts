import { defineConfig } from "vite";

export default defineConfig({
    build: {
        rollupOptions: {
            external: ["better-sqlite3", "sqlite-vec"],
        },
        lib: {
            entry: "src/main.ts",
            formats: ["cjs"],
        },
    },
});
