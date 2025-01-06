import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
    content: string;
    isUser: boolean;
    timestamp: Date;
    apiSettings?: {
        serverUrl: string;
        model: string;
        temperature: number;
        topP: number;
    };
}

export interface ChatSession {
    id: string;
    name: string;
    messages: ChatMessage[];
    lastTimestamp: Date;
    wordCount: number;
    firstMessageTimestamp: Date;
}

const CHAT_SESSIONS_KEY = 'chat_sessions';
const AUTO_SAVE_PREFERENCE_KEY = 'chat_auto_save_preference';

export const getFirstFiveWords = (text: string): string => {
    return text.trim().split(/\s+/).slice(0, 5).join(' ');
};

export const countWords = (messages: ChatMessage[]): number => {
    return messages.reduce((count, msg) => {
        return count + msg.content.trim().split(/\s+/).length;
    }, 0);
};

export const saveChatSession = (session: ChatSession): void => {
    const sessions = getChatSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex !== -1) {
        sessions[existingIndex] = session;
    } else {
        sessions.push(session);
    }
    
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event('chatSessionsUpdated'));
};

export const getChatSessions = (): ChatSession[] => {
    const sessionsJson = localStorage.getItem(CHAT_SESSIONS_KEY);
    if (!sessionsJson) return [];
    
    const sessions = JSON.parse(sessionsJson);
    return sessions.map((session: any) => ({
        ...session,
        lastTimestamp: new Date(session.lastTimestamp),
        firstMessageTimestamp: new Date(session.firstMessageTimestamp),
        messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
        }))
    }));
};

export const createNewSession = (firstMessage: ChatMessage): ChatSession => {
    return {
        id: uuidv4(),
        name: getFirstFiveWords(firstMessage.content),
        messages: [firstMessage],
        lastTimestamp: firstMessage.timestamp,
        wordCount: countWords([firstMessage]),
        firstMessageTimestamp: firstMessage.timestamp
    };
};

export const updateSession = (
    sessionId: string,
    messages: ChatMessage[]
): ChatSession => {
    const session = {
        id: sessionId,
        name: getFirstFiveWords(messages[0].content),
        messages,
        lastTimestamp: messages[messages.length - 1].timestamp,
        wordCount: countWords(messages),
        firstMessageTimestamp: messages[0].timestamp
    };
    
    saveChatSession(session);
    return session;
};

export const loadSession = (sessionId: string): ChatSession | null => {
    const sessions = getChatSessions();
    return sessions.find(s => s.id === sessionId) || null;
};

export const deleteChatSession = (sessionId: string): void => {
    const sessions = getChatSessions().filter(s => s.id !== sessionId);
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event('chatSessionsUpdated'));
};

export const clearAllChatSessions = (): void => {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event('chatSessionsUpdated'));
};

export const getAutoSavePreference = (): boolean => {
    const savedPreference = localStorage.getItem(AUTO_SAVE_PREFERENCE_KEY);
    return savedPreference === null ? true : savedPreference === 'true';
};

export const setAutoSavePreference = (enabled: boolean): void => {
    localStorage.setItem(AUTO_SAVE_PREFERENCE_KEY, enabled.toString());
}; 