import { getEmbeddingProvider } from "./models";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { deleteAttachment, getAttachment } from "./storage";
import { app } from "electron";
import { join } from "path";
import { mkdir } from "fs/promises";
import {
    Attachment,
    Conversation,
    DbInsertData,
    DbResponse,
    EmbeddingData,
    Response,
    SimilarResponse,
} from "src/renderer/types/types";

const DELTA_DATA_DIR = join(app.getPath("userData"), "delta_data");
try {
    mkdir(DELTA_DATA_DIR, { recursive: true });
} catch (error) {
    console.error("Failed to create delta_data directory:", error);
}

const DATABASE_PATH = join(DELTA_DATA_DIR, "delta.db");
const db = new Database(DATABASE_PATH);

// Get the base path without extension
let sqliteVecPath = sqliteVec.getLoadablePath().replace(/\.[^.]+$/, "");

// If we're in a packaged app (asar), adjust the path
if (sqliteVecPath.includes("app.asar")) {
    sqliteVecPath = sqliteVecPath.replace("app.asar", "app.asar.unpacked");
}

console.log("Loading SQLite vector extension from:", sqliteVecPath);
db.loadExtension(sqliteVecPath);

export function ensureTable(): void {
    const attachmentsTableSchema = `
        id TEXT PRIMARY KEY,
        response_id TEXT,
        file_path TEXT,
        type TEXT,
        created_at TEXT,
        FOREIGN KEY(response_id) REFERENCES responses(id)
    `;

    const conversationsTableSchema = `
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at TEXT
    `;

    const embeddingsTableSchema = `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        response_id TEXT,
        embedding BLOB,
        embedding_model TEXT,
        type TEXT
    `;

    const responsesTableSchema = `
        id TEXT PRIMARY KEY,
        model TEXT,
        provider TEXT,
        prompt TEXT,
        system TEXT,
        response TEXT,
        conversation_id TEXT,
        parent_id TEXT,
        duration_ms INTEGER,
        datetime_utc TEXT,
        temperature REAL,
        top_p REAL,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id)
    `;

    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (${conversationsTableSchema});
        CREATE TABLE IF NOT EXISTS responses (${responsesTableSchema});
        CREATE TABLE IF NOT EXISTS attachments (${attachmentsTableSchema});
        CREATE TABLE IF NOT EXISTS embeddings (${embeddingsTableSchema});

        CREATE VIRTUAL TABLE IF NOT EXISTS responses_fts USING fts5(
            id UNINDEXED,
            conversation_id UNINDEXED,
            prompt,
            response,
            content='responses',
            content_rowid='rowid'
        );

        CREATE TRIGGER IF NOT EXISTS responses_ai AFTER INSERT ON responses BEGIN
            INSERT INTO responses_fts(rowid, id, conversation_id, prompt, response)
            VALUES (new.rowid, new.id, new.conversation_id, new.prompt, new.response);
        END;

        CREATE TRIGGER IF NOT EXISTS responses_ad AFTER DELETE ON responses BEGIN
            INSERT INTO responses_fts(responses_fts, rowid, id, conversation_id, prompt, response)
            VALUES('delete', old.rowid, old.id, old.conversation_id, old.prompt, old.response);
        END;

        CREATE TRIGGER IF NOT EXISTS responses_au AFTER UPDATE ON responses BEGIN
            INSERT INTO responses_fts(responses_fts, rowid, id, conversation_id, prompt, response)
            VALUES('delete', old.rowid, old.id, old.conversation_id, old.prompt, old.response);
            INSERT INTO responses_fts(rowid, id, conversation_id, prompt, response)
            VALUES (new.rowid, new.id, new.conversation_id, new.prompt, new.response);
        END;
    `);
}

export function insert(
    response: DbInsertData,
    embeddings?: EmbeddingData,
    conversation?: DbInsertData,
    attachments?: { id: string; file_path: string; type: string }[],
): void {
    db.transaction(() => {
        if (conversation) {
            const columns = Object.keys(conversation).join(", ");
            const placeholders = Object.keys(conversation).map(() => "?").join(
                ", ",
            );
            const values = Object.values(conversation);

            const stmt = db.prepare(
                `INSERT INTO conversations (${columns}) VALUES (${placeholders})`,
            );
            stmt.run(...values);
        }

        const responseColumns = Object.keys(response).join(", ");
        const responsePlaceholders = Object.keys(response).map(() => "?").join(
            ", ",
        );

        const responseStmt = db.prepare(
            `INSERT INTO responses (${responseColumns}) VALUES (${responsePlaceholders})`,
        );
        responseStmt.run(...Object.values(response));

        if (embeddings) {
            const embeddingStmt = db.prepare(`
                INSERT INTO embeddings (
                    response_id,
                    embedding,
                    embedding_model,
                    type
                ) VALUES (?, ?, ?, ?)
            `);

            embeddingStmt.run(
                response.id,
                Buffer.from(
                    new Float32Array(embeddings.prompt_embedding).buffer,
                ),
                embeddings.model,
                "prompt",
            );
            embeddingStmt.run(
                response.id,
                Buffer.from(
                    new Float32Array(embeddings.response_embedding).buffer,
                ),
                embeddings.model,
                "response",
            );
        }

        if (attachments) {
            const attachmentStmt = db.prepare(`
                INSERT INTO attachments (id, response_id, file_path, type, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const attachment of attachments) {
                attachmentStmt.run(
                    attachment.id,
                    response.id,
                    attachment.file_path,
                    attachment.type,
                    new Date().toISOString(),
                );
            }
        }
    })();
}

export function getAllConversations(): Conversation[] {
    const stmt = db.prepare(
        `SELECT * FROM conversations ORDER BY created_at DESC`,
    );
    return stmt.all() as Conversation[];
}

export async function getResponsesForConversation(
    conversationId: string,
): Promise<Response[]> {
    const stmt = db.prepare(`
        SELECT
            r.*,
            json_group_array(
                json_object(
                    'id', a.id,
                    'response_id', a.response_id,
                    'file_path', a.file_path,
                    'type', a.type,
                    'created_at', a.created_at
                )
            ) FILTER (WHERE a.id IS NOT NULL) as attachments
        FROM responses r
        LEFT JOIN attachments a ON r.id = a.response_id
        WHERE r.conversation_id = ?
        GROUP BY r.id
        ORDER BY r.datetime_utc ASC
    `);

    const responses = stmt.all(conversationId) as DbResponse[];
    const res = await Promise.all(responses.map(async (response) => {
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
    return res;
}

export function deleteResponse(
    conversationId: string,
    responseId: string,
): void {
    const stmt = db.prepare(`
        DELETE FROM responses
        WHERE id = ? AND conversation_id = ?
    `);
    stmt.run(responseId, conversationId);
}

export function deleteConversation(conversationId: string): void {
    const getAttachments = db.prepare(`
        SELECT file_path FROM attachments
        WHERE response_id IN (
            SELECT id FROM responses WHERE conversation_id = ?
        )
    `);

    const deleteEmbeddings = db.prepare(`
        DELETE FROM embeddings
        WHERE response_id IN (
            SELECT id FROM responses WHERE conversation_id = ?
        )
    `);

    const deleteAttachments = db.prepare(`
        DELETE FROM attachments
        WHERE response_id IN (
            SELECT id FROM responses WHERE conversation_id = ?
        )
    `);

    const deleteResponses = db.prepare(`
        DELETE FROM responses
        WHERE conversation_id = ?
    `);

    const deleteConversation = db.prepare(`
        DELETE FROM conversations
        WHERE id = ?
    `);

    db.transaction(() => {
        const attachments = getAttachments.all(conversationId) as {
            file_path: string;
        }[];
        attachments.forEach((attachment) => {
            try {
                deleteAttachment(attachment.file_path);
            } catch (error) {
                console.error(
                    `Failed to delete attachment ${attachment.file_path}:`,
                    error,
                );
            }
        });

        deleteEmbeddings.run(conversationId);
        deleteAttachments.run(conversationId);
        deleteResponses.run(conversationId);
        deleteConversation.run(conversationId);
    })();
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
        const embeddingProvider = getEmbeddingProvider("nomic-embed-text");
        const embeddingsRes = await embeddingProvider.doEmbed({
            values: [query],
        });
        const queryEmbedding = Buffer.from(
            new Float32Array(embeddingsRes.embeddings[0]).buffer,
        );

        vectorResults = db.prepare(`
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
        `).all(queryEmbedding, limit * 2) as SimilarResponse[];
    }

    if (searchType === "text" || searchType === "combined") {
        ftsResults = db.prepare(`
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
        `).all(query, query, query, limit * 2) as SimilarResponse[];
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
