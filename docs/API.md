# API Documentation

Complete reference for all API endpoints in the AI Voice Keyboard application.

## Base URL

All API endpoints are prefixed with `/api`:

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication via session cookies. The session cookie is automatically set after login/signup and sent with subsequent requests.

**Session Cookie Name**: `auth_session`

## Endpoints

### Authentication

#### POST `/api/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
- `201 Created`: User created successfully
  ```json
  {
    "message": "User created successfully"
  }
  ```
- `400 Bad Request`: Validation error
  ```json
  {
    "error": "Email and password are required"
  }
  ```
  or
  ```json
  {
    "error": "Password must be at least 8 characters"
  }
  ```
  or
  ```json
  {
    "error": "User already exists"
  }
  ```

**Notes:**
- Password must be at least 8 characters
- Email must be unique
- User is automatically logged in after signup

---

#### POST `/api/login`

Authenticate and create a session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
- `200 OK`: Login successful
  ```json
  {
    "message": "Login successful"
  }
  ```
- `400 Bad Request`: Missing fields
  ```json
  {
    "error": "Email and password are required"
  }
  ```
- `401 Unauthorized`: Invalid credentials
  ```json
  {
    "error": "Invalid email or password"
  }
  ```

**Notes:**
- Session cookie is set automatically in response headers

---

#### POST `/api/logout`

Invalidate the current session.

**Response:**
- `200 OK`: Logout successful
  ```json
  {
    "message": "Logout successful"
  }
  ```
- `401 Unauthorized`: Not authenticated
  ```json
  {
    "error": "Not authenticated"
  }
  ```

**Notes:**
- Requires authentication
- Session cookie is cleared

---

### Transcription

#### POST `/api/transcribe`

Transcribe an audio chunk using OpenAI Whisper API.

**Authentication:** Required

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `audio` field containing audio file (Blob/File)

**Example:**
```javascript
const formData = new FormData();
formData.append('audio', audioBlob, 'audio.webm');

const response = await fetch('/api/transcribe', {
  method: 'POST',
  body: formData
});
```

**Response:**
- `200 OK`: Transcription successful
  ```json
  {
    "text": "The transcribed text here"
  }
  ```
- `400 Bad Request`: No audio file provided
  ```json
  {
    "error": "No audio file provided"
  }
  ```
- `401 Unauthorized`: Not authenticated or invalid OpenAI API key
  ```json
  {
    "error": "Unauthorized"
  }
  ```
- `429 Too Many Requests`: OpenAI API quota exceeded
  ```json
  {
    "error": "OpenAI API quota exceeded. Please check your OpenAI account billing and plan details.",
    "code": "QUOTA_EXCEEDED"
  }
  ```

**Notes:**
- Audio format: WebM (default from MediaRecorder API)
- Whisper API supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
- **Requires**: OpenAI API key with access to `whisper-1` model
- Custom dictionary words are automatically included in the prompt
- Each request processes a 5-second audio slice

---

#### POST `/api/post-process`

Improve transcription text using OpenAI's text-to-text models.

**Authentication:** Required

**Model Selection:**
The endpoint automatically detects and uses the first available text-to-text model supported by your OpenAI API key. It tries models in this order:
1. `gpt-5-nano` (preferred - ultra-low latency)
2. `gpt-4o-mini` (fallback - fast and cost-effective)
3. `gpt-4o` (fallback - high quality)
4. `gpt-4-turbo` (fallback - good quality)
5. `gpt-3.5-turbo` (fallback - widely available)

This ensures the application works with any OpenAI API key that has access to at least one text-to-text model.

**Request Body:**
```json
{
  "text": "The transcription text to improve"
}
```

**Response:**
- `200 OK`: Post-processing successful
  ```json
  {
    "text": "Improved transcription text",
    "improved": true,
    "model": "gpt-5-nano"
  }
  ```
  
  The `model` field indicates which model was actually used (e.g., "gpt-5-nano", "gpt-4o-mini", etc.)
- `400 Bad Request`: Invalid or missing text
  ```json
  {
    "error": "Text is required"
  }
  ```
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Processing failed (returns original text)
  ```json
  {
    "error": "Post-processing failed",
    "errorType": "quota",
    "improved": false
  }
  ```

**Notes:**
- **Requires**: OpenAI API key with access to at least one text-to-text model
- Automatically selects the first available model from the preference list
- Includes custom dictionary words in the prompt
- Falls back to original text if all models fail
- Improves grammar, punctuation, capitalization
- Response includes the model name that was actually used

---

#### GET `/api/transcriptions`

Get all saved transcriptions for the authenticated user.

**Authentication:** Required

**Response:**
- `200 OK`: Success
  ```json
  {
    "transcriptions": [
      {
        "id": "clx123...",
        "content": "Final processed content",
        "originalContent": "Original transcription",
        "transcriptionSource": "whisper-1",
        "postProcessed": true,
        "postProcessingModel": "gpt-5-nano",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
  ```
- `401 Unauthorized`: Not authenticated

**Notes:**
- Results are ordered by creation date (newest first)
- Only returns transcriptions belonging to the authenticated user

---

#### POST `/api/transcriptions`

Save a new transcription.

**Authentication:** Required

**Request Body:**
```json
{
  "content": "The transcription text",
  "originalContent": "Original before post-processing",
  "transcriptionSource": "whisper-1",
  "postProcessed": true,
  "postProcessingModel": "gpt-5-nano"
}
```

**Response:**
- `201 Created`: Transcription saved
  ```json
  {
    "transcription": {
      "id": "clx123...",
      "content": "The transcription text",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```
- `400 Bad Request`: Invalid data
  ```json
  {
    "error": "Content is required"
  }
  ```
- `401 Unauthorized`: Not authenticated

---

#### DELETE `/api/transcriptions/[id]`

Delete a specific transcription.

**Authentication:** Required

**URL Parameters:**
- `id`: Transcription ID

**Response:**
- `200 OK`: Deletion successful
  ```json
  {
    "message": "Transcription deleted successfully"
  }
  ```
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Transcription belongs to another user
- `404 Not Found`: Transcription not found

---

### Dictionary

#### GET `/api/dictionary`

Get all custom dictionary words for the authenticated user.

**Authentication:** Required

**Response:**
- `200 OK`: Success
  ```json
  {
    "words": [
      {
        "id": "clx123...",
        "word": "ShadCN",
        "userId": "user123"
      }
    ]
  }
  ```
- `401 Unauthorized`: Not authenticated

**Notes:**
- Results are ordered alphabetically
- Only returns words belonging to the authenticated user

---

#### POST `/api/dictionary`

Add a new word to the custom dictionary.

**Authentication:** Required

**Request Body:**
```json
{
  "word": "ShadCN"
}
```

**Response:**
- `201 Created`: Word added
  ```json
  {
    "word": {
      "id": "clx123...",
      "word": "ShadCN",
      "userId": "user123"
    }
  }
  ```
- `400 Bad Request`: Invalid word or duplicate
  ```json
  {
    "error": "Word is required"
  }
  ```
  or
  ```json
  {
    "error": "Word already exists in your dictionary"
  }
  ```
- `401 Unauthorized`: Not authenticated

**Notes:**
- Word is trimmed of whitespace
- Duplicate check is case-sensitive
- Words are used in Whisper API prompts to improve accuracy

---

#### DELETE `/api/dictionary/[id]`

Delete a specific dictionary word.

**Authentication:** Required

**URL Parameters:**
- `id`: Dictionary word ID

**Response:**
- `200 OK`: Deletion successful
  ```json
  {
    "message": "Word deleted successfully"
  }
  ```
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Word belongs to another user
- `404 Not Found`: Word not found

---

### Utility

#### GET `/api/check-whisper`

Check if OpenAI Whisper API is available and accessible.

**Authentication:** Required

**Response:**
- `200 OK`: Check completed
  ```json
  {
    "available": true,
    "model": "whisper-1"
  }
  ```
  or
  ```json
  {
    "available": false,
    "reason": "Invalid API key"
  }
  ```
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Check failed

**Notes:**
- Uses a minimal test audio file
- Checks API key validity and Whisper access
- Returns `available: true` even if quota is exceeded (indicates valid key)

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE" // Optional, for specific error types
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Access denied (resource belongs to another user)
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit or quota exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

Currently, there is no rate limiting implemented. However, OpenAI API has its own rate limits:

- **Whisper API**: Varies by plan (check OpenAI dashboard)
- **GPT API**: Varies by plan (check OpenAI dashboard)

## Request/Response Logging

All API requests include detailed logging with:
- Request ID for tracing
- Performance metrics (duration)
- Error details (when applicable)

Check server logs for debugging information.

