import { ollama } from "ollama-ai-provider";
import { streamText } from "ai";
import { ipcMain } from "electron";

export function setupAIHandler() {
    ipcMain.on("start-stream", async (event, messages) => {
        try {
            console.log("DEBUG: Starting stream");
            const result = streamText({
                model: ollama("llama3.2"),
                messages,
            });

            for await (const chunk of result.textStream) {
                try {
                    event.sender.send("stream-data", {
                        value: chunk,
                        timestamp: Date.now(),
                    });
                } catch (error) {
                    console.error("Failed to send chunk:", error);
                }
            }
            event.sender.send("stream-complete");
        } catch (error) {
            console.error("Streaming error:", error);
        }
    });
}
