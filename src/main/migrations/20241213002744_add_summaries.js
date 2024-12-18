/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.createTable("summaries", (table) => {
        table.text("id").primary();
        table.text("response_id");
        table.text("conversation_id");
        table.text("summary");
        table.text("type");
        table.text("created_at");

        table.foreign("response_id")
            .references("id")
            .inTable("responses")
            .onDelete("CASCADE");

        table.foreign("conversation_id")
            .references("id")
            .inTable("conversations")
            .onDelete("CASCADE");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists("summaries");
};
