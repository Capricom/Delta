import knex from "knex";
import { getEmbeddingProvider } from "./models";
import { deleteAttachment, getAttachment } from "./storage";
import { app } from "electron";
import { join } from "path";
import { getConfig } from "../../knexfile";

import {
    Attachment,
    Conversation,
    DbInsertData,
    DbResponse,
    EmbeddingData,
    Response,
    SimilarResponse,
} from "src/renderer/types/types";

const filename = join(app.getPath("userData"), "delta_data", "delta.db");
console.log(`Using database at ${filename}`);

const config = getConfig(filename);

export const db = knex(config);
db.raw("PRAGMA journal_mode = WAL");

export async function ensureTables(): Promise<void> {
    try {
        console.log("Running database migrations...");
        await db.migrate.latest(config.migrations);
        console.log("Database migrations completed successfully");
    } catch (error) {
        console.error("Migration failed:", error);
        throw error;
    }
}

export async function insert(
    response: DbInsertData,
    embeddings?: EmbeddingData,
    conversation?: DbInsertData,
    attachments?: { id: string; file_path: string; type: string }[],
): Promise<void> {
    await db.transaction(async (trx) => {
        if (conversation && Object.keys(conversation).length > 0) {
            await trx("conversations").insert(conversation);
        }

        if (Object.keys(response).length > 0) {
            await trx("responses").insert(response);
        }

        if (embeddings) {
            await trx("embeddings").insert([
                {
                    response_id: response.id,
                    embedding: Buffer.from(
                        new Float32Array(embeddings.prompt_embedding).buffer,
                    ),
                    embedding_model: embeddings.model,
                    type: "prompt",
                },
                {
                    response_id: response.id,
                    embedding: Buffer.from(
                        new Float32Array(embeddings.response_embedding).buffer,
                    ),
                    embedding_model: embeddings.model,
                    type: "response",
                },
            ]);
        }

        if (attachments && attachments.length > 0) {
            await trx("attachments").insert(
                attachments.map((attachment) => ({
                    id: attachment.id,
                    response_id: response.id,
                    file_path: attachment.file_path,
                    type: attachment.type,
                    created_at: new Date().toISOString(),
                })),
            );
        }
    });
}

export async function getAllConversations(): Promise<Conversation[]> {
    return await db("conversations")
        .orderBy("created_at", "desc");
}

export async function getResponsesForConversation(
    conversationId: string,
): Promise<Response[]> {
    const responses = await db("responses")
        .select(
            "responses.*",
            db.raw(`json_group_array(
                json_object(
                    'id', attachments.id,
                    'response_id', attachments.response_id,
                    'file_path', attachments.file_path,
                    'type', attachments.type,
                    'created_at', attachments.created_at
                )
            ) FILTER (WHERE attachments.id IS NOT NULL) as attachments`),
        )
        .leftJoin("attachments", "responses.id", "attachments.response_id")
        .where("responses.conversation_id", conversationId)
        .groupBy("responses.id")
        .orderBy("responses.datetime_utc", "asc") as DbResponse[];

    return await Promise.all(responses.map(async (response) => {
        const attachments = JSON.parse(
            response.attachments || "[]",
        ) as Attachment[];
        const base64Attachments = await Promise.all(
            attachments.map(async (attachment) => {
                const data = await getAttachment(attachment.file_path);
                return `data:image/${attachment.type};base64,${
                    Buffer.from(data).toString("base64")
                }`;
            }),
        );
        return {
            ...response,
            attachments: base64Attachments,
        };
    }));
}

export async function deleteResponse(
    conversationId: string,
    responseId: string,
): Promise<void> {
    await db("responses")
        .where({
            id: responseId,
            conversation_id: conversationId,
        })
        .delete();
}

export async function deleteConversation(
    conversationId: string,
): Promise<void> {
    await db.transaction(async (trx) => {
        const attachments = await trx("attachments")
            .select("file_path")
            .whereIn(
                "response_id",
                trx("responses")
                    .select("id")
                    .where("conversation_id", conversationId),
            );

        for (const attachment of attachments) {
            try {
                await deleteAttachment(attachment.file_path);
            } catch (error) {
                console.error(
                    `Failed to delete attachment ${attachment.file_path}:`,
                    error,
                );
            }
        }

        await trx("embeddings")
            .whereIn(
                "response_id",
                trx("responses")
                    .select("id")
                    .where("conversation_id", conversationId),
            )
            .delete();

        await trx("attachments")
            .whereIn(
                "response_id",
                trx("responses")
                    .select("id")
                    .where("conversation_id", conversationId),
            )
            .delete();

        await trx("responses")
            .where("conversation_id", conversationId)
            .delete();

        await trx("conversations")
            .where("id", conversationId)
            .delete();
    });
}

export async function findSimilarResponses(
    query: string,
    limit = 10,
    offset = 0,
    searchType: "vector" | "text" | "combined" = "combined",
): Promise<SimilarResponse[]> {
    let vectorResults: SimilarResponse[] = [];
    let ftsResults: SimilarResponse[] = [];

    if (searchType === "vector" || searchType === "combined") {
        const sanitizedQuery = query.replace(/[^\w\s]/g, "").trim();
        const embeddingProvider = getEmbeddingProvider("nomic-embed-text");
        const embeddingsRes = await embeddingProvider.doEmbed({
            values: [sanitizedQuery],
        });
        const queryEmbedding = Buffer.from(
            new Float32Array(embeddingsRes.embeddings[0]).buffer,
        );

        vectorResults = await db.raw(
            `
            WITH vector_matches AS (
                SELECT
                    e.id, e.response_id, e.type, r.prompt, r.response, r.conversation_id,
                    r.model, r.provider, r.datetime_utc,
                    CASE WHEN e.type = 'prompt' THEN r.prompt ELSE r.response END as text,
                    vec_distance_cosine(e.embedding, ?) as distance
                FROM embeddings e
                JOIN responses r ON e.response_id = r.id
                ORDER BY distance
                LIMIT ?
            )
            SELECT * FROM vector_matches
        `,
            [queryEmbedding, limit * 2],
        );
    }

    if (searchType === "text" || searchType === "combined") {
        const sanitizedQuery = query.replace(/[^\w\s]/g, "").trim();
        ftsResults = await db.raw(
            `
            WITH fts_matches AS (
                SELECT
                    NULL as id, r.id as response_id,
                    CASE
                        WHEN instr(r.prompt, ?) > 0 THEN 'prompt'
                        ELSE 'response'
                    END as type,
                    r.prompt, r.response, r.conversation_id, r.model, r.provider, r.datetime_utc,
                    CASE
                        WHEN instr(r.prompt, ?) > 0 THEN r.prompt
                        ELSE r.response
                    END as text,
                    bm25(responses_fts) as distance
                FROM responses_fts
                JOIN responses r ON responses_fts.id = r.id
                WHERE responses_fts MATCH ?
                ORDER BY distance
                LIMIT ?
            )
            SELECT * FROM fts_matches
        `,
            [sanitizedQuery, sanitizedQuery, sanitizedQuery, limit * 2],
        );
    }

    if (searchType === "combined") {
        const maxVectorDist = Math.max(
            ...vectorResults.map((r) => r.distance),
            1,
        );
        const maxFtsDist = Math.max(...ftsResults.map((r) => r.distance), 1);

        vectorResults.forEach((r) => {
            r.distance /= maxVectorDist;
        });
        ftsResults.forEach((r) => {
            r.distance /= maxFtsDist;
        });
    }

    const seenIds = new Set<string>();
    const combinedResults = [...vectorResults, ...ftsResults]
        .sort((a, b) => a.distance - b.distance)
        .filter((result) => {
            if (!seenIds.has(result.response_id)) {
                seenIds.add(result.response_id);
                return true;
            }
            return false;
        });

    return combinedResults.slice(offset, offset + limit);
}

export default db;
