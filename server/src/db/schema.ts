import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
}

// export const User = pgTable("users", {
//   id: integer().primaryKey().generatedAlwaysAsIdentity(),
//   name: varchar({ length: 255 }).notNull(),
//   age: integer().notNull(),
//   email: varchar({ length: 255 }).notNull().unique(),
//   phone: varchar({ length: 20 }).notNull(),
//   password: varchar({ length: 255 }).notNull(),
//   ...timestamps,
// });

// export const Question = pgTable("questions", {
//   id: integer().primaryKey().generatedAlwaysAsIdentity(),
//   question: varchar({ length: 1024 }).notNull(),
//   optionA: varchar({ length: 1024 }).notNull(),
//   optionB: varchar({ length: 1024 }).notNull(),
//   optionC: varchar({ length: 1024 }).notNull(),
//   optionD: varchar({ length: 1024 }).notNull(),
//   answer: varchar({ length: 1024 }).notNull(),
//   category: varchar({ length: 255 }).notNull(),
//   year: varchar({ length: 255 }).notNull(),
//   region: varchar({ length: 255 }).notNull(),
//   ...timestamps,
// });