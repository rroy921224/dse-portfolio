import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

/**
 * In Next.js (serverless), modules can be re-evaluated per request in dev mode,
 * so we cache the connection on the global object to avoid creating a new
 * connection on every hot-reload / invocation.
 *
 * In the worker (a long-running process), this cache just means connectDB()
 * is safe to call once at startup and skip on subsequent calls.
 */
let cached = global._mongooseConn;

if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
