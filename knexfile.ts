import { join } from "path";
import type { Knex } from "knex";
import sqliteVec from "sqlite-vec";
import { app } from "electron";

export const getConfig = (filename: string): Knex.Config => {
  const isProd = app?.isPackaged || false;
  const migrationsPath = isProd
    ? join(process.resourcesPath, "migrations")
    : join("./src", "main", "migrations");

  console.log(`Using migrations from ${migrationsPath}`);
  console.log(`Production mode: ${isProd}`);

  let sqliteVecPath = sqliteVec.getLoadablePath().replace(/\.[^.]+$/, "");
  if (sqliteVecPath.includes("app.asar")) {
    sqliteVecPath = sqliteVecPath.replace("app.asar", "app.asar.unpacked");
  }
  console.log(`Loading sqlite-vec extension from ${sqliteVecPath}`);

  return {
    client: "better-sqlite3",
    connection: {
      filename,
      driver: require("better-sqlite3"),
    },
    pool: {
      afterCreate: (conn: any, cb: Function) => {
        conn.loadExtension(sqliteVecPath);
        cb();
      },
    },
    useNullAsDefault: true,
    migrations: {
      directory: migrationsPath,
      loadExtensions: [".js"],
      extension: "js",
    },
  };
};

const defaultDbDir = join(
  process.env.APPDATA ||
    (process.platform == "darwin"
      ? join(process.env.HOME!, "Library", "Application Support")
      : join(process.env.HOME!, ".local", "share")),
  "delta",
  "delta_data",
  "delta.db",
);

export default getConfig(defaultDbDir);
