import { Attachment } from "ai";
import { app } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { ulid } from "ulid";

const DELTA_DATA_DIR = join(app.getPath("userData"), "delta_data");
const ATTACHMENTS_DIR = join(DELTA_DATA_DIR, "attachments");

export interface StoredAttachment {
    id: string;
    file_path: string;
    type: string;
}

export async function initAttachmentStorage() {
    try {
        await mkdir(ATTACHMENTS_DIR, { recursive: true });
    } catch (error) {
        console.error("Failed to create attachments directory:", error);
    }
}

export async function storeAttachment(
    attachment: Attachment,
): Promise<StoredAttachment> {
    const attachmentId = ulid();
    const match = attachment.url.match(
        /^data:image\/(\w+);base64,(.+)$/,
    );
    if (!match) {
        throw new Error("Invalid base64 image data");
    }
    const [, type, cleanBase64] = match;
    const buffer = Buffer.from(cleanBase64, "base64");

    const filePath = join("attachments", attachmentId);
    const fullPath = join(ATTACHMENTS_DIR, attachmentId);

    await writeFile(fullPath, buffer);

    return {
        id: attachmentId,
        file_path: filePath,
        type,
    };
}
export async function getAttachment(filePath: string): Promise<Buffer> {
    const fullPath = join(DELTA_DATA_DIR, filePath);
    const fs = await import("fs/promises");
    return fs.readFile(fullPath);
}

export async function deleteAttachment(filePath: string): Promise<void> {
    const fullPath = join(DELTA_DATA_DIR, filePath);
    const fs = await import("fs/promises");
    await fs.unlink(fullPath);
}
