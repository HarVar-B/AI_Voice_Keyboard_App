# Architecture Overview

This document describes the system architecture, design decisions, and technical implementation of the AI Voice Keyboard application.

## System Overview

AI Voice Keyboard is a real-time voice transcription application that processes audio in slices and provides near-real-time transcription feedback. The application uses a modern web stack with Next.js, PostgreSQL, and OpenAI APIs.

## High-Level Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (React Client) │
└────────┬────────┘
         │
         │ HTTP/HTTPS
         │
┌────────▼─────────────────────────────────────┐
│         Next.js Application                  │
│  ┌──────────────────────────────────────┐   │
│  │  App Router (Pages & API Routes)    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Middleware (Auth Protection)       │   │
│  └──────────────────────────────────────┘   │
└────────┬────────────────────────────────────┘
         │
    ┌────┴────┬──────────────┬──────────────┐
    │         │              │              │
┌───▼───┐ ┌──▼────┐   ┌──────▼──────┐ ┌────▼────┐
│PostgreSQL│ │Lucia Auth│   │OpenAI Whisper│ │OpenAI GPT│
│Database  │ │Sessions  │   │   API        │ │  API     │
└──────────┘ └──────────┘   └──────────────┘ └──────────┘
```

## Technology Stack

### Frontend
- **Next.js 16** (App Router): React framework with server-side rendering
- **React 19**: UI library
- **ShadCN UI**: Component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Node.js Runtime**: Server-side JavaScript execution

### Database
- **PostgreSQL**: Relational database
- **Prisma ORM**: Type-safe database client and migrations

### Authentication
- **Lucia Auth**: Session-based authentication library
- **bcryptjs**: Password hashing

### AI Services
- **OpenAI Whisper API**: Speech-to-text transcription (requires `whisper-1` model)
- **OpenAI Text-to-Text Models**: Text post-processing and improvement
  - Automatically uses first available: `gpt-5-nano` → `gpt-4o-mini` → `gpt-4o` → `gpt-4-turbo` → `gpt-3.5-turbo`

### Deployment
- **Railway**: Platform-as-a-Service (recommended)
- **Vercel**: Alternative deployment option

## Core Components

### 1. Audio Recording & Slicing

**Location**: `app/(app)/page.tsx`

The frontend uses the browser's `MediaRecorder` API to capture audio from the user's microphone. Audio is recorded in 5-second chunks using `mediaRecorder.start(5000)`.

**Flow:**
1. User clicks "Start Recording"
2. Browser requests microphone permission
3. `MediaRecorder` instance is created with the audio stream
4. Recording starts with 5-second slice intervals
5. Each slice triggers `ondataavailable` event
6. Audio blob is sent to `/api/transcribe` endpoint
7. Transcribed text is appended to the transcript in real-time

**Key Implementation Details:**
- Uses `useRef` to persist `MediaRecorder` instance across renders
- Tracks pending transcriptions to show loading state
- Handles cleanup on component unmount

### 2. Transcription API

**Location**: `app/api/transcribe/route.ts`

Processes audio chunks and returns transcribed text using OpenAI Whisper API.

**Flow:**
1. Validates user authentication
2. Extracts audio file from FormData
3. Fetches user's custom dictionary words from database
4. Creates prompt string with custom words
5. Converts File to Buffer for OpenAI SDK
6. Calls Whisper API with audio and prompt
7. Returns transcribed text

**Key Features:**
- Custom dictionary integration (improves accuracy for technical terms)
- Comprehensive error handling (quota, API key, network errors)
- Request logging with performance metrics

### 3. Post-Processing

**Location**: `app/api/post-process/route.ts`

Improves transcription quality using OpenAI's text-to-text models for grammar, punctuation, and readability.

**Flow:**
1. Validates user authentication
2. Receives transcription text
3. Fetches user's custom dictionary words
4. Creates improvement prompt with dictionary context
5. Attempts to call OpenAI API with multiple models in order:
   - `gpt-5-nano` (preferred)
   - `gpt-4o-mini` (fallback)
   - `gpt-4o` (fallback)
   - `gpt-4-turbo` (fallback)
   - `gpt-3.5-turbo` (fallback)
6. Uses the first model that succeeds
7. Returns improved text with model name

**Key Features:**
- Automatic model detection (uses first available model)
- Graceful fallback (returns original text if all models fail)
- Preserves technical terms from dictionary
- Works with any OpenAI API key that has at least one text-to-text model
- Returns the model name used for transparency

### 4. Authentication System

**Location**: `lib/auth.ts`, `middleware.ts`

Uses Lucia Auth for session-based authentication.

**Components:**
- **Session Management**: Cookie-based sessions stored in database
- **Password Hashing**: bcrypt with 10 rounds
- **Route Protection**: Middleware checks for session cookie
- **Edge-Compatible**: Separate validation function for middleware (edge runtime)

**Flow:**
1. User signs up/logs in via `/api/signup` or `/api/login`
2. Password is hashed (signup) or verified (login)
3. Session is created and stored in database
4. Session cookie is set in response
5. Middleware checks cookie on protected routes
6. API routes validate session using `validateRequest()`

### 5. Database Schema

**Location**: `prisma/schema.prisma`

**Models:**

- **User**: User accounts with email and hashed password
- **Session**: Active user sessions (linked to User)
- **Transcription**: Saved transcriptions with metadata
- **DictionaryWord**: Custom words for improving transcription accuracy

**Relationships:**
- User → Sessions (one-to-many)
- User → Transcriptions (one-to-many)
- User → DictionaryWords (one-to-many)

**Indexes:**
- Sessions indexed by userId
- Transcriptions indexed by userId and createdAt
- DictionaryWords indexed by userId

### 6. Custom Dictionary

**Location**: `app/api/dictionary/route.ts`, `app/(app)/dictionary/page.tsx`

Allows users to add custom words that are included in Whisper API prompts.

**How It Works:**
1. User adds words via dictionary page
2. Words are stored in database (linked to user)
3. When transcribing, words are fetched and formatted as prompt
4. Prompt: `"Use these spellings: Word1, Word2, Word3."`
5. Whisper API uses this context to improve accuracy

**Benefits:**
- Improves transcription of technical terms
- Handles brand names and proper nouns
- User-specific customization

## Data Flow

### Transcription Flow

```
User speaks → MediaRecorder captures audio
    ↓
5-second slice available → ondataavailable event
    ↓
Frontend sends blob to /api/transcribe
    ↓
Backend fetches dictionary words
    ↓
Calls OpenAI Whisper API with audio + prompt
    ↓
Returns transcribed text
    ↓
Frontend appends text to transcript
    ↓
(Optional) User clicks "Post-Process"
    ↓
Frontend sends text to /api/post-process
    ↓
Backend calls GPT-5-nano API
    ↓
Returns improved text
    ↓
Frontend updates transcript
    ↓
User clicks "Stop" → Final transcript saved to database
```

### Authentication Flow

```
User submits login form
    ↓
POST /api/login with email/password
    ↓
Backend verifies password (bcrypt.compare)
    ↓
Creates session in database
    ↓
Sets session cookie in response
    ↓
Browser stores cookie
    ↓
Subsequent requests include cookie
    ↓
Middleware checks cookie exists
    ↓
API routes validate session via validateRequest()
```

## Security Considerations

### Authentication & Authorization
- Passwords are hashed with bcrypt (10 rounds)
- Sessions are stored in database (not just cookies)
- Session cookies are httpOnly (set by Lucia)
- Session cookies are secure in production (HTTPS only)
- All API routes validate user ownership before operations

### Data Isolation
- Users can only access their own transcriptions
- Users can only manage their own dictionary words
- Database queries filter by `userId`

### API Security
- OpenAI API keys are stored server-side only (env variables)
- No sensitive data exposed in client-side code
- Error messages don't leak sensitive information

## Performance Optimizations

### Frontend
- React hooks for efficient state management
- useRef for persisting MediaRecorder instance
- Debouncing/throttling where appropriate
- Optimistic UI updates

### Backend
- Prisma connection pooling (singleton pattern)
- Efficient database queries (indexed fields)
- Request logging with performance metrics
- Error handling prevents unnecessary retries

### Database
- Indexes on frequently queried fields (userId, createdAt)
- Cascade deletes for data consistency
- Efficient queries (select only needed fields)

## Scalability Considerations

### Current Limitations
- Single database instance
- No caching layer
- No rate limiting
- No CDN for static assets

### Potential Improvements
- Add Redis for session caching
- Implement rate limiting (per user/IP)
- Add database read replicas
- Use CDN for static assets
- Implement queue system for transcription requests
- Add monitoring and alerting

## Error Handling

### Frontend
- Try-catch blocks around async operations
- User-friendly error messages via toast notifications
- Graceful degradation (fallback to original text if post-processing fails)
- Loading states for better UX

### Backend
- Comprehensive error handling in all API routes
- Specific error codes for different failure types
- Detailed logging for debugging
- Consistent error response format

## Development Workflow

1. **Local Development**
   - Run `npm run dev` for development server
   - Uses local PostgreSQL or Railway database
   - Hot reloading enabled

2. **Database Migrations**
   - Use `npx prisma db push` for schema changes
   - Use `npx prisma migrate dev` for production migrations
   - Generate Prisma Client: `npx prisma generate`

3. **Testing**
   - Manual testing recommended
   - Check browser console for errors
   - Monitor server logs for API issues

4. **Deployment**
   - Push to GitHub
   - Railway auto-deploys from main branch
   - Set environment variables in Railway dashboard
   - Run database migrations on first deploy

## Future Enhancements

Potential improvements and features:

1. **Real-time Updates**: WebSocket support for live transcription
2. **Multiple Languages**: Support for non-English transcription
3. **Audio Format Options**: Support for different audio formats
4. **Export Features**: Export transcriptions as PDF, DOCX, etc.
5. **Collaboration**: Share transcriptions with other users
6. **Analytics**: Track transcription accuracy and usage
7. **Mobile App**: Native mobile application
8. **Offline Support**: Service workers for offline transcription

