import { join } from "path";
import type { Knex } from "knex";
import sqliteVec from "sqlite-vec";

let sqliteVecPath = sqliteVec.getLoadablePath().replace(/\.[^.]+$/, "");

export const getConfig = (filename: string): Knex.Config => ({
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
});

export default getConfig(join(__dirname, "delta.db"));
