interface UserActivity {
queries: string[];
timestamps: number[];
}


export class RateLimitService {
private users = new Map<string, UserActivity>();
private WINDOW = 120000; // 2 min


check(userId: string, query: string): { allow: boolean; shouldSummarize: boolean; prev: string[] } {
const now = Date.now();
let act = this.users.get(userId) || { queries: [], timestamps: [] };


// Clean old
act.queries = act.queries.filter((_, i) => now - act.timestamps[i] < this.WINDOW);
act.timestamps = act.timestamps.filter(t => now - t < this.WINDOW);


// Check cooldown
if (act.timestamps.length > 0) {
const last = act.timestamps[act.timestamps.length - 1];
if (now - last < 10000) { // 10s cooldown
return { allow: false, shouldSummarize: false, prev: [] };
}
}


act.queries.push(query);
act.timestamps.push(now);
this.users.set(userId, act);


return {
allow: true,
shouldSummarize: act.queries.length >= 3,
prev: act.queries.length >= 3 ? [...act.queries] : []
};
}


clear(userId: string) {
this.users.delete(userId);
}
}