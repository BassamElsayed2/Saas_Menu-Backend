// Load environment variables FIRST, before any other imports
// This must be the very first import in server.ts
import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "test"
    ? ".env.test"
    : ".env.development";

// Load from project root (where .env files are located)
const result = dotenv.config({ path: envFile });

if (result.error) {
  console.error(`❌ Failed to load ${envFile}:`, result.error);
} else {
  console.log(`✅ Loaded environment from: ${envFile}`);
  console.log(`   DB_HOST: ${process.env.DB_HOST}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME}`);
  console.log(`   DB_USER: ${process.env.DB_USER}`);
}

// Export for potential use
export default result;

