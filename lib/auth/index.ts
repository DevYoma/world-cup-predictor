import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the current authenticated user's Clerk ID.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get the current authenticated user's full Clerk user object.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  return currentUser();
}

/**
 * Retrieve the user from our database matching the Clerk userId session.
 * If the user is authenticated in Clerk but missing from the users table,
 * we dynamically fetch their profile from Clerk and upsert them.
 */
export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  // 1. Check if user already exists in Postgres
  const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
  if (existingUser && existingUser.displayName !== "Anonymous Predictor") {
    return existingUser;
  }

  // 2. Fetch profile from Clerk API server-side
  const clerkUser = await currentUser();
  if (!clerkUser) return existingUser || null;

  const email = clerkUser.emailAddresses[0]?.emailAddress || `${userId}@placeholder.com`;
  
  // Derive a cleaner display name if first/last name are missing from Clerk profile (e.g. email/password signup)
  let displayName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "";
  if (!displayName) {
    const emailLocalPart = email.split("@")[0] || "";
    displayName = emailLocalPart
      .split(/[\._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Predictor";
  }

  const avatarUrl = clerkUser.imageUrl || null;

  // 3. Upsert user into database
  const [newUser] = await db.insert(users)
    .values({
      id: userId,
      email,
      displayName,
      avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        displayName,
        avatarUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  return newUser;
}
