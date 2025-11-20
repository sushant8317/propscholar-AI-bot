interface Thread {
messages: Array<{ role: string; content: string; time: number }>;
topic: string | null;
}


export class ContextService {
private threads = new Map<string, Thread>();
private TTL = 600000; // 10 min


add(userId: string, role: string, content: string, topic?: string) {
let t = this.threads.get(userId) || { messages: [], topic: null };
const now = Date.now();
t.messages = t.messages.filter(m => now - m.time < this.TTL);
t.messages.push({ role, content, time: now });
if (t.messages.length > 10) t.messages = t.messages.slice(-10);
if (topic) t.topic = topic;
this.threads.set(userId, t);
}


get(userId: string): string {
const t = this.threads.get(userId);
if (!t || t.messages.length === 0) return '';
const recent = t.messages.slice(-4);
return '\nContext:\n' + recent.map(m => `${m.role}: ${m.content}`).join('\n') + '\n';
}
}