import mongoose, { Schema, Document, Model } from "mongoose";

interface IAnalytics extends Document {
  userId: string;
  query: string;
  intent: string;
  responseTime: number;
  modelUsed: string;
  cached: boolean;
  feedback?: string;
  timestamp: Date;
}

const AnalyticsSchema: Schema<IAnalytics> = new Schema({
  userId: { type: String, required: true },
  query: { type: String, required: true },
  intent: { type: String, required: true },
  responseTime: { type: Number, required: true },
  modelUsed: { type: String, required: true },
  cached: { type: Boolean, required: true },
  feedback: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const Analytics: Model<IAnalytics> = mongoose.model<IAnalytics>(
  "Analytics",
  AnalyticsSchema
);

export class AnalyticsService {
  async log(data: Partial<IAnalytics>) {
    try {
      await Analytics.create(data);
      console.log(`📊 Logged intent: ${data.intent}`);
    } catch (err) {
      console.error("Analytics error:", err);
    }
  }

  async logFeedback(userId: string, query: string, feedback: string) {
    await Analytics.findOneAndUpdate(
      {
        userId,
        query,
        timestamp: { $gte: new Date(Date.now() - 300000) }
      },
      { feedback },
      { sort: { timestamp: -1 } }
    );
  }
}
