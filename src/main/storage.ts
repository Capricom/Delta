import { app } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { ulid } from "ulid";

const ATTACHMENTS_DIR = join(
    app.getPath("userData"),
    "delta_data",
    "attachments",
);

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
    base64Data: string,
): Promise<StoredAttachment> {
    const attachmentId = ulid();
    const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
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
    const fullPath = join(process.cwd(), "public", filePath);
    const fs = await import("fs/promises");
    return fs.readFile(fullPath);
}

export async function deleteAttachment(filePath: string): Promise<void> {
    const fullPath = join(process.cwd(), "public", filePath);
    const fs = await import("fs/promises");
    await fs.unlink(fullPath);
}
