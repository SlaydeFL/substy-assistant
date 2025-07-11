import { ChatMessage } from "./openrouter";
export declare const chatGraph: import("@langchain/langgraph").CompiledStateGraph<import("@langchain/langgraph").StateType<{
    messages: import("@langchain/langgraph").BinaryOperatorAggregate<ChatMessage[], ChatMessage[]>;
    response: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
}>, import("@langchain/langgraph").UpdateType<{
    messages: import("@langchain/langgraph").BinaryOperatorAggregate<ChatMessage[], ChatMessage[]>;
    response: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
}>, "__start__" | "llm" | "memory" | "calendar", {
    messages: import("@langchain/langgraph").BinaryOperatorAggregate<ChatMessage[], ChatMessage[]>;
    response: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
}, {
    messages: import("@langchain/langgraph").BinaryOperatorAggregate<ChatMessage[], ChatMessage[]>;
    response: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
}, import("@langchain/langgraph").StateDefinition>;
export declare function processUserMessage(input: string): Promise<string>;
