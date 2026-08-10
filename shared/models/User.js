import mongoose from "mongoose";

/**
 * NOTE: When using @auth/mongodb-adapter, NextAuth manages its own
 * `users`, `accounts`, `sessions`, `verification_tokens` collections
 * automatically — you generally do NOT need to hand-write a User model
 * for the OAuth (Google) flow.
 *
 * This schema exists for the email/password (Credentials) flow, where
 * WE are responsible for storing the hashed password ourselves, since
 * NextAuth's adapter doesn't handle credential storage for you.
 *
 * If NextAuth's adapter is already creating a `users` collection, point
 * this schema at the SAME collection name ("users") and treat this as an
 * extension of it (adding `password`), rather than a second parallel
 * collection — otherwise you'll end up with two different "user" records
 * for the same person depending on how they signed up.
 */
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    image: String,
    password: {
      // only present for email/password signups; absent for Google OAuth users
      type: String,
      select: false, // never return this field by default on queries
    },
    authProviders: {
      type: [String], // e.g. ["google"], ["credentials"], or both if linked
      default: [],
    },
  },
  { timestamps: true, collection: "users" }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
