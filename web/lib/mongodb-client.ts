import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

/**
 * Auth.js's MongoDBAdapter talks to MongoDB via the native driver, NOT
 * mongoose — so this is a separate connection from shared/db.js. Both
 * ultimately point at the same database, they just use different client
 * libraries under the hood.
 *
 * Cached on global in development to avoid creating a new connection on
 * every hot-reload.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
