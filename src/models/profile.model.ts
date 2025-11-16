// src/models/profile.model.ts
import mongoose from "mongoose";

export interface IProfile {
  userId: string;
  summary?: string;
  lastSeen?: Date;
  preferences?: Record<string, any>;
}

const ProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    summary: { type: String, default: "" },
    lastSeen: { type: Date, default: Date.now },
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { collection: "profiles" }
);

export const ProfileModel = mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);
