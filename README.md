# AI Voice Keyboard

A real-time voice transcription application that converts speech to text using AI-powered transcription. Built with Next.js, featuring sliced audio processing for near-real-time transcription, custom dictionary support, and transcription history management.

## 🚀 Features

- **Real-time Voice Transcription**: Record audio and get transcriptions in near-real-time using 5-second audio slices
- **AI-Powered Transcription**: Uses OpenAI Whisper API for accurate speech-to-text conversion
- **Custom Dictionary**: Add custom words (technical terms, brand names, proper nouns) to improve transcription accuracy
- **Post-Processing**: Optional GPT-powered text improvement for grammar, punctuation, and readability
- **Transcription History**: Save and manage your transcription history with copy-to-clipboard functionality
- **User Authentication**: Secure email/password authentication with session management
- **Responsive Design**: Modern UI built with ShadCN components, works on desktop and mobile
- **Theme Support**: Dark/light mode toggle

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: ShadCN UI + Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: Lucia Auth
- **AI Services**: 
  - OpenAI Whisper API (transcription - requires `whisper-1` model)
  - OpenAI Text-to-Text Models (post-processing - auto-detects available model)
- **Deployment**: Railway (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- PostgreSQL database (local or hosted)
- OpenAI API key with:
  - **Required**: Access to `whisper-1` model for audio-to-text transcription
  - **Required**: Access to at least one text-to-text model (e.g., `gpt-5-nano`, `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, or `gpt-3.5-turbo`) for post-processing

## 🏃 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AI_Voice_Keyboard_App
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
OPENAI_API_KEY="sk-your-openai-api-key"
LUCIA_SECRET="your-random-secret-key-min-32-chars"
NODE_ENV="development"
```

**Important**: 
- Generate `LUCIA_SECRET` using: `openssl rand -base64 32`
- **OpenAI API Key Requirements**:
  - Must have access to `whisper-1` model for audio transcription
  - Must have access to at least one text-to-text model for post-processing
  - The application automatically detects and uses the first available text-to-text model (tries: gpt-5-nano → gpt-4o-mini → gpt-4o → gpt-4-turbo → gpt-3.5-turbo)

### 4. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed database with sample data
npm run seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create an Account

- Navigate to `/signup`
- Create an account with email and password (minimum 8 characters)
- You'll be automatically logged in after signup

## 📁 Project Structure

```
AI_Voice_Keyboard_App/
├── app/                    # Next.js App Router pages and API routes
│   ├── (app)/             # Protected routes (require authentication)
│   │   ├── page.tsx       # Main dictation page
│   │   ├── dictionary/    # Dictionary management page
│   │   └── layout.tsx     # Protected layout with navigation
│   ├── api/               # API routes
│   │   ├── transcribe/    # Audio transcription endpoint
│   │   ├── post-process/  # Text improvement endpoint
│   │   ├── dictionary/    # Dictionary CRUD endpoints
│   │   ├── transcriptions/# Transcription history endpoints
│   │   ├── login/         # Authentication endpoints
│   │   └── check-whisper/  # Whisper API availability check
│   ├── login/             # Login page
│   └── signup/            # Signup page
├── components/            # React components
│   ├── ui/               # ShadCN UI components
│   └── ...               # Custom components
├── lib/                  # Utility libraries
│   ├── auth.ts          # Authentication logic (Lucia)
│   ├── prisma.ts        # Prisma client singleton
│   └── utils.ts         # Utility functions
├── prisma/              # Database schema and migrations
│   ├── schema.prisma    # Prisma schema
│   ├── seed.ts          # Database seeding script
│   └── cleanup.ts       # Database cleanup script
└── docs/                # Documentation
    ├── API.md           # API documentation
    ├── ARCHITECTURE.md  # System architecture
    ├── DEPLOYMENT.md    # Deployment guide
    └── TROUBLESHOOTING.md # Troubleshooting guide
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with sample data
- `npm run cleanup` - Clean up database (removes all data)

## 📚 Documentation

- [API Documentation](./docs/API.md) - Complete API reference
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and architecture
- [Deployment Guide](./docs/DEPLOYMENT.md) - How to deploy to production
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Build Plan](./plan.md) - Original development plan

## 🎯 Key Features Explained

### Real-time Audio Slicing

The app records audio in 5-second chunks and sends each chunk to the Whisper API immediately. This allows transcriptions to appear in near-real-time as you speak, rather than waiting for the entire recording to finish.

### Custom Dictionary

Add technical terms, brand names, or proper nouns to your dictionary. These words are included in the Whisper API prompt, significantly improving transcription accuracy for specialized vocabulary.

### Post-Processing

After transcription, you can optionally post-process the text using OpenAI's text-to-text models to:
- Fix grammar and punctuation errors
- Improve capitalization
- Make the text more readable
- Preserve technical terms from your dictionary

**Model Selection**: The application automatically detects and uses the first available text-to-text model supported by your API key. It tries models in order of preference: `gpt-5-nano` (preferred) → `gpt-4o-mini` → `gpt-4o` → `gpt-4-turbo` → `gpt-3.5-turbo`. This ensures compatibility with any OpenAI API key that has access to at least one text-to-text model.

## 🔒 Security

- Passwords are hashed using bcrypt
- Sessions are managed securely with Lucia Auth
- All API routes require authentication (except login/signup)
- User data is isolated (users can only access their own transcriptions and dictionary words)

## 🚢 Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions. The app is designed to be deployed on Railway, but can be adapted for other platforms.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is part of a take-home assignment. Please refer to your assignment guidelines for licensing information.

## 🐛 Troubleshooting

See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for common issues and solutions.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [ShadCN UI](https://ui.shadcn.com/)
- Authentication via [Lucia Auth](https://lucia-auth.com/)
- AI transcription powered by [OpenAI Whisper](https://openai.com/research/whisper)
