import { getEmbeddingProvider } from "./models";
import Database, { RunResult } from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { deleteAttachment, getAttachment } from "./storage";
import { app } from "electron";
import { join } from "path";
import { mkdir } from "fs/promises";

export interface Attachment {
    id: string;
    response_id: string;
    file_path: string;
    type: string;
    created_at: string;
    url?: string;
}

export interface DbResponse {
    id: string;
    model: string;
    provider: string;
    prompt: string;
    system: string;
    response: string;
    conversation_id: string;
    parent_id: string;
    duration_ms: number;
    datetime_utc: string;
    temperature: number;
    top_p: number;
    attachments: string;
}

export interface Response {
    id: string;
    model: string;
    provider: string;
    prompt: string;
    system: string;
    response: string;
    conversation_id: string;
    parent_id: string;
    duration_ms: number;
    datetime_utc: string;
    temperature: number;
    top_p: number;
    attachments: string[];
}

export interface Conversation {
    id: string;
    title: string;
    created_at: string;
}

export interface DbInsertData {
    [key: string]: any;
}

export interface EmbeddingData {
    prompt_embedding: number[];
    response_embedding: number[];
    model: string;
}

export interface DbFunctions {
    ensureTable: () => void;
    insert: (tableName: string, data: DbInsertData) => RunResult;
    getAllConversations: () => Conversation[];
}

export interface SimilarResponse {
    id: number;
    response_id: string;
    conversation_id: string;
    type: "prompt" | "response";
    prompt: string;
    response: string;
    text: string;
    distance: number;
    model: string;
    provider: string;
    datetime_utc: string;
}

const DELTA_DATA_DIR = join(app.getPath("userData"), "delta_data");
try {
    mkdir(DELTA_DATA_DIR, { recursive: true });
} catch (error) {
    console.error("Failed to create delta_data directory:", error);
}

const DATABASE_PATH = join(DELTA_DATA_DIR, "delta.db");
const db = new Database(DATABASE_PATH);
sqliteVec.load(db);

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
        datetime_utc DATETIME,
        temperature REAL,
        top_p REAL
    `;

    db.prepare(
        `CREATE TABLE IF NOT EXISTS attachments (${attachmentsTableSchema})`,
    ).run();

    db.prepare(
        `CREATE TABLE IF NOT EXISTS conversations (${conversationsTableSchema})`,
    ).run();

    db.prepare(
        `CREATE TABLE IF NOT EXISTS embeddings (${embeddingsTableSchema})`,
    ).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS responses (${responsesTableSchema})`)
        .run();
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
    limit: number = 10,
    offset: number = 0,
): Promise<SimilarResponse[]> {
    const embeddingProvider = getEmbeddingProvider("");
    const embeddingsRes = await embeddingProvider.doEmbed({
        values: [query],
    });
    const queryEmbedding = Buffer.from(
        new Float32Array(embeddingsRes.embeddings[0]).buffer,
    );

    const stmt = db.prepare(`
        SELECT
            e.id,
            e.response_id,
            e.type,
            r.prompt,
            r.response,
            r.conversation_id,
            r.model,
            r.provider,
            r.datetime_utc,
            CASE
                WHEN e.type = 'prompt' THEN r.prompt
                ELSE r.response
            END as text,
            vec_distance_cosine(e.embedding, ?) as distance
        FROM embeddings e
        JOIN responses r ON e.response_id = r.id
        ORDER BY distance
        LIMIT ? OFFSET ?
    `);

    return stmt.all(queryEmbedding, limit, offset) as SimilarResponse[];
}

export default db;
