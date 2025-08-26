# Brain Teaser

Brain Teaser is an SMS-Based Quiz Show based on general knowledge, history and current affairs of the country. Users can win lots of great prizes by replying question with the right answers.

## ⚡ Features

- Framework: [Fastify 5](https://github.com/fastify/fastify) with [Awilix](https://github.com/jeffijoe/awilix) for the dependency injection and [Pino](https://github.com/pinojs/pino) for logging
- Plugins: [@fastify/helmet](https://github.com/fastify/fastify-helmet) for security headers, [@fastify/swagger](https://github.com/fastify/fastify-swagger) for Swagger documentation, [@fastify/under-pressure](https://github.com/fastify/under-pressure) for automatic handling of "Service Unavailable", [@fastify/awilix](https://github.com/fastify/fastify-awilix) for dependency injection, [typebox](https://github.com/sinclairzx81/typebox) for JSON schema and TS generation and validation
- DB: [Postgres](https://github.com/porsager/postgres) as client + [DBMate](https://github.com/amacneil/dbmate) for seeds and migrations
- Graphql: [Mercurius](https://github.com/mercurius-js/mercurius)
- Format and Style: [Eslint 9](https://eslint.org/) + [Prettier](https://prettier.io/)
- Dependencies validation: [depcruise](https://github.com/sverweij/dependency-cruiser)
- Release flow: [Husky](https://github.com/typicode/husky) + [Commitlint](https://commitlint.js.org/) + [Semantic-release](https://github.com/semantic-release/semantic-release)
- Tests: E2E tests with [Cucumber](https://cucumber.io/docs/installation/javascript/), and unit and integration tests with node:test

## 👉 Table of Contents

- [Getting Started](#start)

## <a name="start"></a>✨ Getting Started

```bash
npx degit capivas-africa-team/brain-teaser brain-teaser
cd brain-teaser

# Create .env file from sample
cp .env.example .env

# To enable yarn 4 follow the instruction here: https://yarnpkg.com/getting-started/install
yarn #Install dependencies.
```

### Common Commands

- `yarn start` - start a development server.
- `yarn build` - build for production. The generated files will be on the `dist` folder.
- `yarn test` - run unit and integration tests.
- `yarn test:coverage` - run unit and integration tests with coverage.
- `yarn test:unit` - run only unit tests.
- `yarn test:coverage` - run only integration tests.
- `yarn test:e2e` - run E2E tests
- `yarn type-check` - check for typescript errors.
- `yarn deps:validate` - check for dependencies problems (i.e. use route code inside a repository).
- `yarn outdated` - update dependencies interactively.
- `yarn format` - format all files with Prettier.
- `yarn lint` - runs ESLint.
- `yarn create:env` - creates and .env file by copying .env.example.
- `yarn db:create-migration` - creates a new db migration.
- `yarn db:migrate` - start db migrations.
- `yarn db:create-seed` - creates a new db seed.
- `yarn db:seed` - start db seeds.