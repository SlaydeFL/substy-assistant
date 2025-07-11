export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}
export interface ChatCompletionOptions {
    model?: string;
    temperature?: number;
}
export declare function chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<string>;
