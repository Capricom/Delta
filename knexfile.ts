import { join } from "path";
import type { Knex } from "knex";
import sqliteVec from "sqlite-vec";

export const getConfig = (filename: string): Knex.Config => {
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
      directory: "./src/main/migrations",
      loadExtensions: [".js"],
      extension: "js",
    },
  };
};

export default getConfig(join(__dirname, "delta.db"));
