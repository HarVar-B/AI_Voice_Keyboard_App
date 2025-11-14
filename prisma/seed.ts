import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Dummy transcriptions with metadata
const dummyTranscriptions = [
  {
    content: "Hello, this is a test recording. I'm testing the voice keyboard application.",
    originalContent: "hello this is a test recording im testing the voice keyboard application",
    transcriptionSource: "whisper-1",
    postProcessed: true,
    postProcessingModel: "gpt-5-nano",
  },
  {
    content: "The weather today is beautiful. I think I'll go for a walk in the park.",
    originalContent: null,
    transcriptionSource: "web-speech-api",
    postProcessed: false,
    postProcessingModel: null,
  },
  {
    content: "I need to remember to buy groceries: milk, eggs, bread, and cheese.",
    originalContent: "i need to remember to buy groceries milk eggs bread and cheese",
    transcriptionSource: "whisper-1",
    postProcessed: true,
    postProcessingModel: "gpt-5-nano",
  },
  {
    content: "Meeting notes: Discussed the new project timeline and assigned tasks to team members.",
    originalContent: null,
    transcriptionSource: "whisper-1",
    postProcessed: false,
    postProcessingModel: null,
  },
  {
    content: "Quick reminder: Call the dentist tomorrow at 2 PM to schedule an appointment.",
    originalContent: "quick reminder call the dentist tomorrow at 2 pm to schedule an appointment",
    transcriptionSource: "web-speech-api",
    postProcessed: true,
    postProcessingModel: "gpt-5-nano",
  },
  {
    content: "Today I learned about Next.js and Prisma. They work great together for building web applications.",
    originalContent: "today i learned about next.js and prisma they work great together for building web applications",
    transcriptionSource: "whisper-1",
    postProcessed: true,
    postProcessingModel: "gpt-5-nano",
  },
  {
    content: "Recipe idea: Pasta with tomato sauce, garlic, basil, and parmesan cheese.",
    originalContent: null,
    transcriptionSource: "web-speech-api",
    postProcessed: false,
    postProcessingModel: null,
  },
  {
    content: "Book recommendation: 'The Pragmatic Programmer' is an excellent read for software developers.",
    originalContent: "book recommendation the pragmatic programmer is an excellent read for software developers",
    transcriptionSource: "whisper-1",
    postProcessed: true,
    postProcessingModel: "gpt-5-nano",
  },
  {
    content: "Travel plans: Planning a trip to Japan next spring. Need to research hotels and flights.",
    originalContent: null,
    transcriptionSource: "whisper-1",
    postProcessed: false,
    postProcessingModel: null,
  },
  {
    content: "Workout routine: Did 30 minutes of cardio and 20 minutes of strength training today.",
    originalContent: "workout routine did 30 minutes of cardio and 20 minutes of strength training today",
    transcriptionSource: "web-speech-api",
    postProcessed: true,
    postProcessingModel: "gpt-5-nano",
  },
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

  // Create dummy transcriptions with varying timestamps and metadata
  console.log("Creating dummy transcriptions...");
  const transcriptionPromises = dummyTranscriptions.map((transcription, index) => {
    // Create transcriptions with dates spread over the last 7 days
    const daysAgo = dummyTranscriptions.length - index - 1;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(Math.floor(Math.random() * 24));
    createdAt.setMinutes(Math.floor(Math.random() * 60));

    return prisma.transcription.create({
      data: {
        content: transcription.content,
        originalContent: transcription.originalContent,
        transcriptionSource: transcription.transcriptionSource,
        postProcessed: transcription.postProcessed,
        postProcessingModel: transcription.postProcessingModel,
        userId: user.id,
        createdAt,
      },
    });
  });

  await Promise.all(transcriptionPromises);
  console.log(`✅ Created ${dummyTranscriptions.length} transcriptions`);
  
  // Log summary of created transcriptions
  const whisperCount = dummyTranscriptions.filter(t => t.transcriptionSource === "whisper-1").length;
  const webSpeechCount = dummyTranscriptions.filter(t => t.transcriptionSource === "web-speech-api").length;
  const postProcessedCount = dummyTranscriptions.filter(t => t.postProcessed).length;
  console.log(`   - ${whisperCount} from Whisper-1, ${webSpeechCount} from Web Speech API`);
  console.log(`   - ${postProcessedCount} post-processed with GPT-5-nano`);

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

