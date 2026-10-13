import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on("connected", () => {
    console.log("[database] connected");
  });

  mongoose.connection.on("error", (error: unknown) => {
    console.error("[database] connection error:", error);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[database] disconnected");
  });

  await mongoose.connect(env.MONGODB_URI);

  await mongoose.syncIndexes();
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
