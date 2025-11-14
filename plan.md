# AI Voice Keyboard: Step-by-Step Build Plan

This document outlines the development plan for building the AI Voice Keyboard app, as specified in the take-home assignment. We will follow the required tech stack and build the app in logical phases, focusing on the core "sound clip slicing" feature.

---

## Core Tech Stack

* **Framework:** Next.js (App Router)
* **UI:** ShadCN
* **Database:** Postgres (hosted on Railway)
* **ORM:** Prisma
* **Auth:** Lucia Auth (recommended for Next.js + Prisma)
* **AI:** OpenAI API (for Whisper)
* **Deployment:** Railway

---

## Phase 1: Project Setup & Database

**Goal:** Initialize the project, set up the UI library, connect the database, and deploy a "Hello World" version.

1.  **Initialize Next.js App:**
    ```bash
    npx create-next-app@latest ai-voice-keyboard
    # Use TypeScript, Tailwind, App Router
    ```

2.  **Set up Railway:**
    * Create a new project on Railway.
    * Add a **Postgres** database service.
    * Go to the database > "Connect" tab and copy the **Connection URL**.

3.  **Set up Prisma:**
    * Install Prisma: `npm install prisma --save-dev`
    * Initialize Prisma: `npx prisma init`
    * In `.env`, set `DATABASE_URL` to your Railway connection URL.
    * In `prisma/schema.prisma`, change the `provider` to `postgresql`.

4.  **Set up ShadCN:**
    * Initialize ShadCN: `npx shadcn-ui@latest init`
    * Accept the defaults. This will set up your `components.json` and Tailwind CSS.

5.  **Create Initial Layout & Deploy:**
    * Create a simple `app/page.tsx` with a ShadCN button to test.
    * Create a new GitHub repository and push your code.
    * Connect this repository to your Railway project.
    * **Result:** Your app is live on a Railway URL.

---

## Phase 2: User Authentication

**Goal:** Add email/password authentication. Users must be logged in to use the app.

1.  **Install Lucia Auth:**
    ```bash
    npm install lucia @lucia-auth/adapter-prisma
    ```

2.  **Update Prisma Schema (`schema.prisma`):**
    * Add the `User` and `Session` models required by Lucia.
    * Run `npx prisma db push` to sync your schema with the Railway database.

    ```prisma
    model User {
      id        String    @id @unique
      email     String    @unique
      hashed_password String
      sessions  Session[]
      // Add relations for transcription and dictionary words later
      transcriptions Transcription[]
      dictionaryWords DictionaryWord[]
    }

    model Session {
      id        String   @id @unique
      expiresAt DateTime
      userId    String
      user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    }
    ```

3.  **Implement Auth Logic:**
    * Create `lib/auth.ts` to configure Lucia and the Prisma adapter.
    * Create API routes for:
        * `app/api/signup/route.ts`: Handles new user creation (hashes password).
        * `app/api/login/route.ts`: Handles user login (verifies password, creates session).
        * `app/api/logout/route.ts`: Invalidates the user's session.
    * Create UI components for Sign Up and Sign In using ShadCN `Card`, `Input`, `Label`, and `Button`.

4.  **Create Protected Routes:**
    * Create a `middleware.ts` file to protect all routes except `/login` and `/signup`.
    * Redirect unauthenticated users to the `/login` page.

---

## Phase 3: Core UI & Navigation

**Goal:** Build the main application skeleton for logged-in users.

1.  **Main Layout (`app/(app)/layout.tsx`):**
    * Create a route group `(app)` for protected routes.
    * Add a persistent navigation header.
    * Use ShadCN `NavigationMenu` or a simple flex container.
    * Include links to: **Dictation** (`/`), **Dictionary** (`/dictionary`), and a **Sign Out** button.

2.  **Dictation Page (`app/(app)/page.tsx`):**
    * This will be the main "Dictation" page.
    * Add main components (we'll wire them up later):
        * A large "Start Recording" `Button` (with a Mic icon).
        * A large `Textarea` (set to `readOnly`) to display the final transcription.
        * A "History" section below to list past transcriptions.

3.  **Dictionary Page (`app/(app)/dictionary/page.tsx`):**
    * Add a form (using `Input` and `Button`) to add a new custom word.
    * Add a `Table` (using ShadCN `Table`) to display the user's existing custom words, with a "Delete" button for each.

---

## Phase 4: Core Feature - Sliced Audio Transcription

**Goal:** Implement the "sound clip slicing" to transcribe audio in near-real-time.

1.  **Frontend: Audio Capture (`app/(app)/page.tsx`):**
    * Use `useState` to manage state: `isRecording`, `transcript`.
    * Use `useRef` to hold the `MediaRecorder` instance: `mediaRecorderRef = useRef(null)`.
    * **On "Start" Click:**
        1.  Request mic permission: `navigator.mediaDevices.getUserMedia({ audio: true })`.
        2.  Create a `MediaRecorder` instance with the stream.
        3.  Set `mediaRecorderRef.current = mediaRecorder`.
        4.  Define the `ondataavailable` event handler (see next step).
        5.  Start recording with a 5-second slice: `mediaRecorder.start(5000)`.
        6.  Update UI state (`isRecording = true`, change button to "Stop").

2.  **Frontend: Slicing & Sending (`ondataavailable`):**
    * Inside the `ondataavailable` handler:
        1.  Check if `event.data.size > 0`.
        2.  This `event.data` is the 5-second audio `Blob`.
        3.  Create a `FormData` object.
        4.  `formData.append('audio', event.data, 'audio.webm')`.
        5.  Call our backend API: `fetch('/api/transcribe', { method: 'POST', body: formData })`.
        6.  Handle the response (see step 4).

3.  **Backend: Transcription API (`app/api/transcribe/route.ts`):**
    * Install OpenAI: `npm install openai`.
    * Create a `POST` handler.
    * Get the `FormData` from the request.
    * Extract the audio file.
    * **(Integration with Phase 6):** Fetch the user's custom words from the database. Create a prompt string, e.g., `"Use these spellings: ShadCN, Next.js, Kai Feng."`.
    * Call the Whisper API:
        ```javascript
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.audio.transcriptions.create({
          model: "whisper-1",
          file: audioFile, // The file from FormData
          prompt: userDictionaryPrompt // The prompt from the DB
        });
        ```
    * Return the `response.text` as JSON.

4.  **Frontend: Merging Transcript (`fetch` response):**
    * In the `.then()` block of your `fetch` call:
        1.  Get the `text` from the API's JSON response.
        2.  Append it to the main transcript: `setTranscript(prev => prev + ' ' + text)`.
        3.  The `Textarea` will update automatically.

5.  **Frontend: Stop Recording:**
    * When the "Stop" button is clicked:
        1.  Call `mediaRecorderRef.current.stop()`.
        2.  This will fire `ondataavailable` one last time with the final clip.
        3.  Set `isRecording = false`.
        4.  **(Integration with Phase 5):** After the *final* text is merged, call another API to save the *complete* `transcript` to the database.

---

## Phase 5: Transcription History

**Goal:** Save completed transcriptions to the database and display them.

1.  **Update Prisma Schema (`schema.prisma`):**
    * Add the `Transcription` model.
    * Run `npx prisma db push`.

    ```prisma
    model Transcription {
      id        String   @id @default(cuid())
      content   String
      createdAt DateTime @default(now())
      userId    String
      user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    }
    ```

2.  **Create API Routes (or Next.js Server Actions):**
    * `POST /api/transcriptions`: Saves a new transcription. Takes `content` in the body.
    * `GET /api/transcriptions`: Fetches all transcriptions for the current user, ordered by `createdAt: 'desc'`.

3.  **Connect Frontend (`app/(app)/page.tsx`):**
    * **Saving:** Call the `POST` route when the "Stop" button is pressed and the final transcript is ready.
    * **Displaying:**
        * Fetch from the `GET` route when the page loads.
        * Map over the results and display them in a list of ShadCN `Card` components.
        * Add a "Copy" `Button` to each card.
        * Implement the copy logic: `navigator.clipboard.writeText(transcription.content)`.
        * Show a ShadCN `Toast` notification: "Copied to clipboard!"

---

## Phase 6: Dictionary Feature

**Goal:** Allow users to add custom words to improve AI accuracy.

1.  **Update Prisma Schema (`schema.prisma`):**
    * Add the `DictionaryWord` model.
    * Run `npx prisma db push`.

    ```prisma
    model DictionaryWord {
      id     String @id @default(cuid())
      word   String
      userId String
      user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
    }
    ```

2.  **Create API Routes (or Server Actions):**
    * `POST /api/dictionary`: Adds a new word.
    * `GET /api/dictionary`: Fetches all words for the current user.
    * `DELETE /api/dictionary`: Deletes a word (e.g., using its ID).

3.  **Connect Frontend (`app/(app)/dictionary/page.tsx`):**
    * Wire up the form to the `POST` route.
    * Wire up the `Table` to fetch data from the `GET` route.
    * Wire up the "Delete" button to the `DELETE` route.
    * **Crucially:** Ensure this data is being fetched and used in `/api/transcribe/route.ts` as described in **Phase 4, Step 3**.

---

## Phase 7: Polish & Deliverables

**Goal:** Ensure the app is "production quality" and all deliverables are ready.

1.  **UI/UX Polish:**
    * Add loading spinners (ShadCN `Loader2`) for:
        * Transcription in progress (an icon on the main page).
        * Saving history.
        * Loading dictionary.
    * Handle all edge cases (e.g., mic permission denied).
    * Ensure the app is responsive and looks good on mobile.
    * Check for smooth transitions and no visual defects.

2.  **Performance Check:**
    * Test a 1-minute dictation. Ensure the text appears promptly after each 5-second slice and the app remains responsive.

3.  **Code Quality:**
    * Review your code.
    * Add comments to complex parts (especially the `MediaRecorder` logic).
    * Ensure file and function names are clear.

4.  **Final Deployment:**
    * Go to Railway > Project > Variables.
    * Add your `OPENAI_API_KEY` and any other secrets (e.g., `LUCIA_SECRET`).
    * Ensure the deployment builds and runs successfully.

5.  **Create Deliverables:**
    * Make your GitHub repository public.
    * Record a demo video (Loom, QuickTime) showcasing all features: Login, Dictation (show the real-time update), History (with copy), and the Dictionary.
    * Submit the assignment form.
