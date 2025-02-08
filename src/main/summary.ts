import { ipcMain } from "electron";
import { ulid } from "ulid";
import { generateText, Message } from "ai";
import { getProvider } from "./models";
import { getSummariesByConversationId, insertSummary } from "./db";

interface Summary {
    id: string;
    response_id: string;
    conversation_id: string;
    summary: string;
    created_at: string;
    type: string;
}

const SYSTEM_PROMPT =
    `You will be provided a two message exchange from a longer conversation.
Your task is to analyze the exchange such that its content can be more easily understood within the context of many other exchanges and a large amount of content.
Do not discuss the user or assistant explicitly.
Output a very concise summary sentence fragment of the exchange.

For example, given the messages:

<|exchange|>
User: I am working on an alternate UX to interact with LLMs using conversation branching. How do you think it can make this valuable to a user?
Assistant: Conversation branching in LLM interactions could provide several valuable benefits to users:

Exploration of Alternatives


Allow users to explore different paths/responses without losing context
Compare multiple solutions or perspectives simultaneously
"What-if" scenarios can be explored in parallel


Better Context Management


Save important conversation points for later reference
Return to previous states without starting over
Maintain multiple concurrent threads of discussion


Learning Enhancement


Visualize how different approaches lead to different outcomes
Better understand cause-and-effect relationships
Create decision trees for complex problems


Workflow Optimization


Switch between different tasks while preserving context
Bookmark important insights
Merge insights from different conversation branches


Collaboration Possibilities


Share specific branches with team members
Annotate different paths for review
Compare different approaches in group settings

Would you like me to elaborate on any of these aspects or discuss specific implementation ideas?
<|exchange|>

A good, example concise summary sentence fragment might be:

<|summary|>
Exploring value of conversation branching UX for LLMs - enables parallel exploration, context preservation, and enhanced learning through multiple conversation paths.
<|summary|>

Now, please output the summary only. No talk, just go.
`;

export async function generateSummaryText(
    messages: Message[],
    model: string,
): Promise<string> {
    const prompt = `Messages:
${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`;

    const { text } = await generateText({
        model: getProvider(model)(model),
        prompt,
        temperature: 0.9,
        topP: 1,
        maxTokens: 256,
        system: SYSTEM_PROMPT,
    });

    return text.replace(/<\|summary\|>/g, "").trim();
}

async function generateSummaryHandler(
    _event: any,
    { messages, model, responseId, conversationId }: {
        messages: Message[];
        model: string;
        responseId: string;
        conversationId: string;
    },
) {
    const summaryId = ulid();
    const summaryText = await generateSummaryText(messages, model);

    const summary = {
        id: summaryId,
        response_id: responseId,
        conversation_id: conversationId,
        summary: summaryText,
        created_at: new Date().toISOString(),
        type: "response",
    };
    await insertSummary(summary);

    return {
        id: summaryId,
        summary: summaryText,
    };
}

async function getSummariesHandler(
    _event: any,
    conversationId: string,
): Promise<Summary[]> {
    return getSummariesByConversationId(conversationId);
}

export function setupSummaryHandler() {
    ipcMain.handle("summary:generate", generateSummaryHandler);
    ipcMain.handle("summary:getByConversation", getSummariesHandler);
}
