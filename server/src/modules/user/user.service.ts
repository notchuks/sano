import { db } from "../../db/index";
import { users } from "../../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export class UserService {
  static async createUser(data: { phoneNumber: string; username: string }) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  static async getUserById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  static async getAllUsers() {
    return db.select().from(users);
  }

  static async updateUser(id: number, data: Partial<{ phoneNumber: string; username: string }>) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  static async deleteUser(id: number) {
    await db.delete(users).where(eq(users.id, id));
    return { success: true };
  }

  static async getLeaderboard({ page = 1, pageSize = 10 } = {}) {
    const limit = Math.max(1, Math.min(pageSize, 100));
    const offset = (Math.max(1, page) - 1) * limit;
    // Get total count for pagination metadata
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    // Get leaderboard users
    const leaderboard = await db
      .select({
        id: users.id,
        username: users.username,
        aggregateScore: users.aggregateScore,
        currentScore: users.currentScore,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.aggregateScore), desc(users.updatedAt))
      .limit(limit)
      .offset(offset);
    return {
      data: leaderboard,
      pagination: {
        page,
        pageSize: limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }
}