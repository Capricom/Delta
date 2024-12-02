import { ipcMain } from "electron";
import db from "./db";
import { getEmbeddingProvider } from "./models";

// Function to backfill FTS data for all responses
async function backfillFTSData(): Promise<void> {
    try {
        // First, clear the FTS table to ensure clean rebuild
        db.prepare(`DELETE FROM responses_fts WHERE 1=1`).run();

        // Get all responses to rebuild FTS
        const responses = db.prepare(`
            SELECT rowid, id, conversation_id, prompt, response
            FROM responses
        `).all();

        // Insert FTS data for each response
        const insertStmt = db.prepare(`
            INSERT INTO responses_fts(rowid, id, conversation_id, prompt, response)
            VALUES (?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((responses) => {
            for (const response of responses) {
                insertStmt.run(
                    response.rowid,
                    response.id,
                    response.conversation_id,
                    response.prompt,
                    response.response
                );
            }
        });

        transaction(responses);
        console.log(`Successfully backfilled FTS data for ${responses.length} responses`);
    } catch (error) {
        console.error("Error backfilling FTS data:", error);
        throw error;
    }
}

async function backfillEmbeddings(): Promise<void> {
    const responses = db.prepare(`
        SELECT id, prompt, response, model
        FROM responses r
        WHERE NOT EXISTS (
            SELECT 1 FROM embeddings e
            WHERE e.response_id = r.id
        )
    `).all();

    console.log(`Found ${responses.length} responses to process`);

    for (
        const response of responses as Array<
            { id: string; prompt: string; response: string; model: string }
        >
    ) {
        try {
            const embeddingProvider = getEmbeddingProvider(response.model);
            const embeddingsRes = await embeddingProvider.doEmbed({
                values: [response.prompt, response.response],
            });

            const stmt = db.prepare(`
                INSERT INTO embeddings (
                    response_id,
                    embedding,
                    embedding_model,
                    type
                ) VALUES (?, ?, ?, ?)
            `);

            stmt.run(
                response.id,
                Buffer.from(
                    new Float32Array(embeddingsRes.embeddings[0]).buffer,
                ),
                "nomic-embed-text",
                "prompt",
            );

            stmt.run(
                response.id,
                Buffer.from(
                    new Float32Array(embeddingsRes.embeddings[1]).buffer,
                ),
                "nomic-embed-text",
                "response",
            );

            console.log(`Updated embeddings for response ${response.id}`);
        } catch (error) {
            console.error(`Failed to process response ${response.id}:`, error);
        }
    }
}

export function setupAdminHandlers(): void {
    ipcMain.handle("admin:backfillFTSData", async () => {
        await backfillFTSData();
    });
    ipcMain.handle("admin:backfillEmbeddings", async () => {
        await backfillEmbeddings();
    });
}