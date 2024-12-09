const sqliteVec = require("sqlite-vec");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema
        .createTable("conversations", (table) => {
            table.text("id").primary();
            table.text("title");
            table.text("created_at");
        })
        .createTable("responses", (table) => {
            table.text("id").primary();
            table.text("model");
            table.text("provider");
            table.text("prompt");
            table.text("system");
            table.text("response");
            table.text("conversation_id").references("id").inTable(
                "conversations",
            );
            table.text("parent_id");
            table.integer("duration_ms");
            table.text("datetime_utc");
            table.float("temperature");
            table.float("top_p");
        })
        .createTable("attachments", (table) => {
            table.text("id").primary();
            table.text("response_id").references("id").inTable("responses");
            table.text("file_path");
            table.text("type");
            table.text("created_at");
        })
        .createTable("embeddings", (table) => {
            table.increments("id");
            table.text("response_id").references("id").inTable("responses");
            table.binary("embedding");
            table.text("embedding_model");
            table.text("type");
        });

    await knex.raw(`CREATE VIRTUAL TABLE responses_fts USING fts5(
      id UNINDEXED,
      conversation_id UNINDEXED,
      prompt,
      response,
      content='responses',
      content_rowid='rowid'
    )`);

    await knex.raw(`CREATE TRIGGER responses_ai AFTER INSERT ON responses BEGIN
      INSERT INTO responses_fts(rowid, id, conversation_id, prompt, response)
      VALUES (new.rowid, new.id, new.conversation_id, new.prompt, new.response);
    END`);

    await knex.raw(`CREATE TRIGGER responses_ad AFTER DELETE ON responses BEGIN
      INSERT INTO responses_fts(responses_fts, rowid, id, conversation_id, prompt, response)
      VALUES('delete', old.rowid, old.id, old.conversation_id, old.prompt, old.response);
    END`);

    await knex.raw(`CREATE TRIGGER responses_au AFTER UPDATE ON responses BEGIN
      INSERT INTO responses_fts(responses_fts, rowid, id, conversation_id, prompt, response)
      VALUES('delete', old.rowid, old.id, old.conversation_id, old.prompt, old.response);
      INSERT INTO responses_fts(rowid, id, conversation_id, prompt, response)
      VALUES (new.rowid, new.id, new.conversation_id, new.prompt, new.response);
    END`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.raw("DROP TRIGGER IF EXISTS responses_au");
    await knex.raw("DROP TRIGGER IF EXISTS responses_ad");
    await knex.raw("DROP TRIGGER IF EXISTS responses_ai");
    await knex.raw("DROP TABLE IF EXISTS responses_fts");

    await knex.schema
        .dropTableIfExists("embeddings")
        .dropTableIfExists("attachments")
        .dropTableIfExists("responses")
        .dropTableIfExists("conversations");
};
