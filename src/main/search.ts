import { ipcMain } from "electron";
import { findSimilarResponses } from "./db";

const searchResponsesHandler = async (_event: any, query: string) => {
    try {
        const results = await findSimilarResponses(query);
        return results;
    } catch (error) {
        console.error("Error searching responses:", error);
        throw new Error("Failed to search responses");
    }
};

export function setupSearchHandlers() {
    ipcMain.handle("search:find", searchResponsesHandler);
}
