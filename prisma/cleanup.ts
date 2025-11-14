import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Database cleanup script
 * 
 * This script removes all data from the database:
 * - All transcriptions
 * - All dictionary words
 * - All sessions (but keeps users)
 * 
 * Usage: npm run cleanup
 * 
 * WARNING: This will permanently delete all data!
 */

async function main() {
  console.log("🧹 Starting database cleanup...");
  console.log("⚠️  WARNING: This will delete all data from the database!");

  try {
    // Delete all transcriptions
    const transcriptionCount = await prisma.transcription.count();
    if (transcriptionCount > 0) {
      console.log(`\n📝 Deleting ${transcriptionCount} transcriptions...`);
      await prisma.transcription.deleteMany({});
      console.log(`✅ Deleted ${transcriptionCount} transcriptions`);
    } else {
      console.log("\n📝 No transcriptions to delete");
    }

    // Delete all dictionary words
    const dictionaryCount = await prisma.dictionaryWord.count();
    if (dictionaryCount > 0) {
      console.log(`\n📚 Deleting ${dictionaryCount} dictionary words...`);
      await prisma.dictionaryWord.deleteMany({});
      console.log(`✅ Deleted ${dictionaryCount} dictionary words`);
    } else {
      console.log("\n📚 No dictionary words to delete");
    }

    // Delete all sessions (but keep users)
    const sessionCount = await prisma.session.count();
    if (sessionCount > 0) {
      console.log(`\n🔐 Deleting ${sessionCount} sessions...`);
      await prisma.session.deleteMany({});
      console.log(`✅ Deleted ${sessionCount} sessions`);
    } else {
      console.log("\n🔐 No sessions to delete");
    }

    // Show remaining user count (users are kept)
    const userCount = await prisma.user.count();
    console.log(`\n👤 Users remaining: ${userCount} (users are not deleted)`);

    console.log("\n🎉 Database cleanup completed successfully!");
    console.log("💡 Run 'npm run seed' to populate with dummy data");
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Fatal error during cleanup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

