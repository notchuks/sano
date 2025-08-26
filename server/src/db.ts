require('dotenv').config();

const main = () => {
  const databaseUrl = process.env.DATABASE_URL;
  console.log('DATABASE_URL:', databaseUrl);
}

main();
