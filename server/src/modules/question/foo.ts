async function getFilteredQuestions(params: FilterParams = {}): Promise<(typeof questions.$inferSelect)[]> {

    const {
      year,
      region,
      category,
      difficulty,
      page = 1, // Default to first page
      pageSize = 10, // Default page size
    } = params;

    // Validate pagination inputs
    const currentPage = Math.max(1, page);
    const limit = Math.min(Math.max(1, pageSize), 100); // Enforce max 100 items per page
    const offset = (currentPage - 1) * limit;

    // Build dynamic where conditions
    const conditions = [];

    if (year) {
      conditions.push(
        and(
          gte(questions.createdAt, new Date(`${year}-01-01`).toDateString()),
          lte(questions.createdAt, new Date(`${year}-12-31 23:59:59`).toDateString()) // Include entire day
        )
      );
    }

    if (region) conditions.push(eq(questions.region, region));
    if (category) conditions.push(eq(questions.category, category));
    if (difficulty) conditions.push(eq(questions.difficulty, difficulty));

    // Main query with pagination
    const query = db
      .select()
      .from(questions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(questions.createdAt)) // Newest first
      .limit(limit)
      .offset(offset);

    // Execute query and get total count in parallel
    const [data, totalResult] = await Promise.all([
      query.execute(),
      db
        .select({ count: sql<number>`count(*)` })
        .from(questions)
        .where(conditions.length ? and(...conditions) : undefined)
        .execute()
        .then((res) => res[0]?.count ?? 0),
    ]);

    return {
      data,
      pagination: {
        totalItems: Number(totalResult),
        totalPages: Math.ceil(Number(totalResult) / limit),
        currentPage,
        pageSize: limit,
        hasNextPage: currentPage * limit < Number(totalResult),
      },
    };
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