import { defineConfig } from "vite";

export default defineConfig({
    build: {
        sourcemap: true,
        rollupOptions: {
            external: ["knex", "better-sqlite3", "sqlite-vec"],
        },
        lib: {
            entry: "src/main.ts",
            formats: ["cjs"],
        },
    },
});
