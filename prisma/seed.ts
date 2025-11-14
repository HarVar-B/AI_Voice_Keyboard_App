import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const dummyTranscriptions = [
  "Hello, this is a test recording. I'm testing the voice keyboard application.",
  "The weather today is beautiful. I think I'll go for a walk in the park.",
  "I need to remember to buy groceries: milk, eggs, bread, and cheese.",
  "Meeting notes: Discussed the new project timeline and assigned tasks to team members.",
  "Quick reminder: Call the dentist tomorrow at 2 PM to schedule an appointment.",
  "Today I learned about Next.js and Prisma. They work great together for building web applications.",
  "Recipe idea: Pasta with tomato sauce, garlic, basil, and parmesan cheese.",
  "Book recommendation: 'The Pragmatic Programmer' is an excellent read for software developers.",
  "Travel plans: Planning a trip to Japan next spring. Need to research hotels and flights.",
  "Workout routine: Did 30 minutes of cardio and 20 minutes of strength training today.",
];

const dummyDictionaryWords = [
  "Next.js",
  "Prisma",
  "TypeScript",
  "OpenAI",
  "Whisper",
  "Lucia",
  "Tailwind",
  "PostgreSQL",
  "bcrypt",
  "API",
];

async function main() {
  console.log("🌱 Starting database seed...");

  // Find the first user, or create a test user if none exists
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log("No user found. Creating a test user...");
    // Create a test user with a hashed password (password: "test123")
    // Using bcrypt hash for "test123"
    const hashedPassword = await bcrypt.hash("test123", 10);
    
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
        hashed_password: hashedPassword,
      },
    });
    console.log(`✅ Created test user: ${user.email}`);
  } else {
    console.log(`✅ Using existing user: ${user.email}`);
  }

  // Clear existing transcriptions for this user (optional - comment out if you want to keep existing data)
  const existingTranscriptions = await prisma.transcription.count({
    where: { userId: user.id },
  });
  
  if (existingTranscriptions > 0) {
    console.log(`Found ${existingTranscriptions} existing transcriptions. Clearing them...`);
    await prisma.transcription.deleteMany({
      where: { userId: user.id },
    });
  }

  // Create dummy transcriptions with varying timestamps
  console.log("Creating dummy transcriptions...");
  const transcriptionPromises = dummyTranscriptions.map((content, index) => {
    // Create transcriptions with dates spread over the last 7 days
    const daysAgo = dummyTranscriptions.length - index - 1;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(Math.floor(Math.random() * 24));
    createdAt.setMinutes(Math.floor(Math.random() * 60));

    return prisma.transcription.create({
      data: {
        content,
        userId: user.id,
        createdAt,
      },
    });
  });

  await Promise.all(transcriptionPromises);
  console.log(`✅ Created ${dummyTranscriptions.length} transcriptions`);

  // Clear existing dictionary words for this user (optional - comment out if you want to keep existing data)
  const existingWords = await prisma.dictionaryWord.count({
    where: { userId: user.id },
  });
  
  if (existingWords > 0) {
    console.log(`Found ${existingWords} existing dictionary words. Clearing them...`);
    await prisma.dictionaryWord.deleteMany({
      where: { userId: user.id },
    });
  }

  // Create dummy dictionary words
  console.log("Creating dummy dictionary words...");
  const dictionaryPromises = dummyDictionaryWords.map((word) =>
    prisma.dictionaryWord.create({
      data: {
        word,
        userId: user.id,
      },
    })
  );

  await Promise.all(dictionaryPromises);
  console.log(`✅ Created ${dummyDictionaryWords.length} dictionary words`);

  console.log("🎉 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

