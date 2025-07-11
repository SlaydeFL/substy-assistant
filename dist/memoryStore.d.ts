export interface UserFact {
    id: string;
    text: string;
    timestamp: number;
}
export declare const MemoryStore: {
    getAll(): UserFact[];
    add(fact: UserFact): void;
};
