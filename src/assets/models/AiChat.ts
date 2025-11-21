export interface Message {
    from: 'user' | 'ai';
    content: string;
    timestamp: number;
    action?: string;
    context?: any;
}