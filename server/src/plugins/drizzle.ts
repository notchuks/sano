// import type { FastifyPluginAsync } from 'fastify'
// import fp from 'fastify-plugin'

// import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
// import { Pool } from "pg";
// import dotenv from 'dotenv'
// import * as schema from '../db/schema';

// dotenv.config()

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: true,
// })

// // const pool = new Pool({
// //   connectionString: process.env.DATABASE_URL,
// //     ssl: {
// //         rejectUnauthorized: false, // Adjust based on your SSL configuration
// //     },
// // });


// declare module 'fastify' {
//   interface FastifyInstance {
//     db: PostgresJsDatabase<typeof schema>
//   }
// }

// const db = drizzle(pool, { schema })

// const drizzlePlugin: FastifyPluginAsync = fp(async (app) => {
//   app.decorate('db', db)

//   app.addHook('onClose', async () => {
//     await pool.end()
//   })
// })

// export default drizzlePlugin;