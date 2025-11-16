import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits } from "discord.js";
import bodyParser from "body-parser";
import basicAuth from "express-basic-auth";
import axios from "axios";
import path from "path";

dotenv.config();

// Routers
import { router as adminRouter } from "./controllers/admin.controller";
import { router as adminUIRouter } from "./controllers/admin-ui.controller";

// Express
const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// View engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Secure /admin API only
app.use(
  "/admin",
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true,
  })
);

app.use("/admin", adminRouter);
app.use("/admin-ui", adminUIRouter);

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Discord bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () => console.log("Bot ready"));
client.login(process.env.DISCORD_TOKEN);

// Root
app.get("/", (req, res) => res.send("PropScholar AI Bot Running"));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
