import { pgTable, serial, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  specialty: varchar("specialty", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  privacyConsent: boolean("privacy_consent").default(false),
  gender: genderEnum("gender"),
  birthDate: varchar("birth_date", { length: 100 }),
  address: varchar("address", { length: 500 }),
  occupation: varchar("occupation", { length: 100 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactNumber: varchar("emergency_contact_number", { length: 20 }),
  insuranceProvider: varchar("insurance_provider", { length: 100 }),
  insurancePolicyNumber: varchar("insurance_policy_number", { length: 100 }),
  allergies: varchar("allergies", { length: 500 }).notNull().default(""),
  currentMedications: varchar("current_medications", { length: 500 }).notNull().default(""),
  pastMedicalHistory: varchar("past_medical_history", { length: 100 }).notNull().default(""),
  familyMedicalHistory: varchar("family_medical_history", { length: 100 }).notNull().default(""),
  identificationType: varchar("identification_type", { length: 100 }).notNull().default(""),
  identificationNumber: varchar("identification_number", { length: 100 }).notNull().default(""),
  identificationDocumentId: varchar("identification_document_id", { length: 100 }).notNull().default(""),
  identificationDocumentUrl: varchar("identification_document_url", { length: 500 }).notNull().default(""),
  primaryPhysician: varchar("primary_physician", { length: 100 }).notNull().default(""),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const questions = pgTable("questions", {
	id: serial("id").primaryKey(),
	question: varchar(),
	optionA: varchar(),
	optionB: varchar(),
	optionC: varchar(),
	optionD: varchar(),
	answer: varchar(),
  category: varchar(),
	year: varchar(),
	region: varchar(),
	difficulty: varchar(),
	createdAt: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }),
});

// User Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  currentScore: integer("current_score").default(0),
  aggregateScore: integer("aggregate_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quiz Table
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: varchar("category", { length: 50 }).notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull(),
  score: integer("score").default(0),
  currentQuestionIndex: integer("current_question_index").default(0), // NEW FIELD
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// QuizQuestion Table (Join Table for Quiz <-> Question)
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  order: integer("order").notNull(), // 1-10
});

export const quizAnswers = pgTable("quiz_answers", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  userAnswer: varchar("user_answer", { length: 10 }).notNull(),
  isCorrect: integer("is_correct").notNull(), // 0 = false, 1 = true (or use boolean if supported)
  answeredAt: timestamp("answered_at").defaultNow(),
});