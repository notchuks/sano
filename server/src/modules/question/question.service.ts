import { and, eq, gte, lte, desc } from "drizzle-orm";
import { db } from "../../db/index";
import { questions } from "../../../drizzle/schema";
import { ca } from "zod/v4/locales";

// Type-safe parameters
interface FilterParams {
	year?: number;
	region?: string;
	category?: string;
	difficulty?: "easy" | "medium" | "hard";
	page?: number;
	pageSize?: number;
}
export default class QuestionService {
  public async getQuestions(): Promise<(typeof questions.$inferSelect)[]> {
    const questionList = await db.select().from(questions);
    // console.log("Questions: ", questionList);

    if (!questionList || questionList.length === 0) {
      throw Error("Questions not found");
    }

    return questionList;
  }

  public async getFilteredQuestions(params: FilterParams = {}): Promise<(typeof questions.$inferSelect)[]> {

		const {
			year,
			region,
			category,
			difficulty,
			page = 1, // Default to first page
			pageSize = 10, // Default page size
		} = params;

		console.log("Params: ", params);

		// Validate pagination inputs
		const currentPage = Math.max(1, page);
		const limit = Math.min(Math.max(1, pageSize), 10); // Enforce max 100 items per page
		const offset = (currentPage - 1) * limit;

		// Build dynamic where conditions
		const conditions = [];

		const capitalize = <T extends string>(s: T) => (s[0].toUpperCase() + s.slice(1)) as Capitalize<typeof s>;
		// console.log("Capitalized Difficulty: ", capitalize(difficulty || "easy"));

		if (region) conditions.push(eq(questions.region, region));
		if (category) conditions.push(eq(questions.category, category));
		if (difficulty) conditions.push(eq(questions.difficulty, capitalize(difficulty)));

		console.log("Conditions: ", conditions);
		console.log("Length of Conditions: ", conditions.length);

		// Main query with pagination
		const query = await db
			.select()
			.from(questions)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(questions.createdAt)) // Newest first
			.limit(limit)
			.offset(offset);

		return query;
	}

	// Example usage:
	// const result = await this.getPaginatedQuestions({
	// 	year: 2023,
	// 	category: "math",
	// 	difficulty: "medium",
	// 	page: 2,
	// 	pageSize: 15,
	// });

	// console.log(result.data); // Questions for page 2
	// console.log(result.pagination); // Pagination metadata
  
}
