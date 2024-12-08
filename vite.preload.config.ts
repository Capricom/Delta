import { defineConfig } from "vite";

export default defineConfig({
    build: {
        rollupOptions: {
            external: ["knex", "better-sqlite3", "sqlite-vec"],
        },
        lib: {
            entry: "src/main.ts",
            formats: ["cjs"],
        },
    },
});
