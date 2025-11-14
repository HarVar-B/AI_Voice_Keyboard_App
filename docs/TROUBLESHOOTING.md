# Troubleshooting Guide

Common issues and solutions for the AI Voice Keyboard application.

## Table of Contents

- [Setup Issues](#setup-issues)
- [Authentication Issues](#authentication-issues)
- [Transcription Issues](#transcription-issues)
- [Database Issues](#database-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)

## Setup Issues

### Issue: `Cannot find module` errors

**Symptoms:**
```
Error: Cannot find module '@/lib/auth'
```

**Solutions:**
1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

2. Check `tsconfig.json` has correct path aliases:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

### Issue: Prisma Client not generated

**Symptoms:**
```
Error: @prisma/client did not initialize yet
```

**Solutions:**
1. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

2. Ensure `DATABASE_URL` is set in `.env`

3. Verify Prisma schema is valid:
   ```bash
   npx prisma validate
   ```

### Issue: Environment variables not loading

**Symptoms:**
- `process.env.OPENAI_API_KEY` is undefined
- Database connection fails

**Solutions:**
1. Ensure `.env` file exists in project root
2. Check `.env` file format (no spaces around `=`)
3. Restart development server after changing `.env`
4. Verify variable names match exactly (case-sensitive)

**Example `.env` format:**
```env
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
LUCIA_SECRET="..."
```

## Authentication Issues

### Issue: Login fails with "Invalid email or password"

**Solutions:**
1. Verify user exists in database:
   ```bash
   npx prisma studio
   # Check Users table
   ```

2. Check password hashing:
   - Passwords are hashed with bcrypt
   - Ensure you're using the correct password

3. Verify database connection:
   - Check `DATABASE_URL` is correct
   - Ensure database is running

### Issue: Session not persisting

**Symptoms:**
- Logged in but redirected to login page
- Session cookie not being set

**Solutions:**
1. Check browser console for cookie errors
2. Verify `LUCIA_SECRET` is set (minimum 32 characters)
3. Check middleware is not blocking cookies
4. Ensure cookies are enabled in browser

3. Check middleware configuration:
   - Verify `SESSION_COOKIE_NAME` matches Lucia's cookie name
   - Check middleware matcher excludes API routes

### Issue: "Unauthorized" errors on API routes

**Solutions:**
1. Verify you're logged in (check browser cookies)
2. Check session exists in database:
   ```bash
   npx prisma studio
   # Check Sessions table
   ```

3. Verify `validateRequest()` is working:
   - Check server logs for authentication errors
   - Ensure session cookie is being sent with requests

## Transcription Issues

### Issue: "Whisper API not available"

**Symptoms:**
- Error message: "Whisper-1 not available"
- Transcription fails

**Solutions:**
1. Check OpenAI API key:
   - Verify key is correct in `.env`
   - **Ensure key has access to `whisper-1` model** (required for transcription)
   - Check API key hasn't expired

2. Verify API key format:
   - Should start with `sk-`
   - No extra spaces or quotes

3. Check OpenAI account:
   - Verify account has credits/quota
   - Check billing status
   - Ensure Whisper API is enabled
   - Verify `whisper-1` model is available in your account

4. Test API key manually:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```
   Look for `whisper-1` in the response

### Issue: Transcription returns empty text

**Solutions:**
1. Check audio quality:
   - Ensure microphone is working
   - Check browser permissions for microphone
   - Try speaking louder or closer to mic

2. Verify audio format:
   - MediaRecorder should produce WebM format
   - Check browser compatibility

3. Check server logs:
   - Look for errors in transcription API
   - Verify audio file is being received

4. Test with different audio:
   - Try recording a longer clip
   - Test with clear speech

### Issue: Transcription is inaccurate

**Solutions:**
1. Add words to custom dictionary:
   - Go to Dictionary page
   - Add technical terms, brand names, proper nouns

2. Improve audio quality:
   - Use a better microphone
   - Reduce background noise
   - Speak clearly and at moderate pace

3. Check language settings:
   - Currently set to English (`language: "en"`)
   - Modify in `app/api/transcribe/route.ts` if needed

### Issue: Post-processing fails

**Symptoms:**
- Error: "Post-processing failed"
- Text doesn't improve

**Solutions:**
1. Check text-to-text model access:
   - **Verify API key has access to at least one text-to-text model**
   - The app tries models in order: `gpt-5-nano` → `gpt-4o-mini` → `gpt-4o` → `gpt-4-turbo` → `gpt-3.5-turbo`
   - Check quota/billing status for the models

2. Verify model availability:
   - Check which models are available in your OpenAI account
   - The app automatically uses the first available model
   - If none are available, post-processing will fail gracefully

3. Check text length:
   - Very long texts may timeout
   - Consider processing in chunks

4. Fallback behavior:
   - App returns original text if all models fail
   - Check server logs to see which models were tried
   - Verify at least one text-to-text model is accessible

5. Check server logs:
   - Look for messages like "Model X not available, trying next model..."
   - This shows which models were attempted

## Database Issues

### Issue: Database connection errors

**Symptoms:**
```
Error: Can't reach database server
Error: P1001: Can't reach database server
```

**Solutions:**
1. Verify `DATABASE_URL`:
   - Check connection string format
   - Ensure credentials are correct
   - Verify host/port are accessible

2. Check database status:
   - Ensure PostgreSQL is running
   - Check database exists
   - Verify network connectivity

3. Test connection:
   ```bash
   npx prisma db pull
   ```

### Issue: Migration errors

**Symptoms:**
```
Error: Migration failed
Error: Table already exists
```

**Solutions:**
1. Reset database (development only):
   ```bash
   npx prisma migrate reset
   ```

2. Push schema without migrations:
   ```bash
   npx prisma db push
   ```

3. Check for schema conflicts:
   ```bash
   npx prisma validate
   ```

### Issue: Data not persisting

**Solutions:**
1. Verify database connection:
   - Check `DATABASE_URL` is correct
   - Ensure database is accessible

2. Check Prisma Client:
   ```bash
   npx prisma generate
   ```

3. Verify transactions:
   - Check server logs for database errors
   - Ensure operations complete successfully

## Deployment Issues

### Issue: Build fails on Railway/Vercel

**Solutions:**
1. Check build logs:
   - Look for specific error messages
   - Check Node.js version compatibility

2. Verify environment variables:
   - Ensure all required variables are set
   - Check variable names match exactly

3. Check dependencies:
   - Ensure `package.json` has all dependencies
   - Verify no platform-specific packages

4. Test build locally:
   ```bash
   npm run build
   ```

### Issue: App works locally but not in production

**Solutions:**
1. Check environment variables:
   - Verify all variables are set in production
   - Ensure values are correct (not placeholders)

2. Check database:
   - Verify production database is accessible
   - Ensure migrations have run

3. Check logs:
   - Review production logs for errors
   - Look for missing environment variables

4. Verify API keys:
   - Ensure production API keys are valid
   - Check API key permissions

### Issue: Database migrations not running

**Solutions:**
1. Run migrations manually:
   ```bash
   # Railway
   railway run npx prisma db push
   
   # Vercel
   vercel env pull .env.local
   npx prisma db push
   ```

2. Add migration to build process:
   - Create a script in `package.json`
   - Run migrations before build

3. Use Prisma Migrate:
   ```bash
   npx prisma migrate deploy
   ```

## Performance Issues

### Issue: Slow transcription

**Solutions:**
1. Check network connection:
   - Slow internet affects API calls
   - Check OpenAI API response times

2. Optimize audio:
   - Reduce audio quality if needed
   - Check audio file size

3. Check server logs:
   - Look for slow database queries
   - Verify API response times

### Issue: High memory usage

**Solutions:**
1. Check for memory leaks:
   - Review MediaRecorder cleanup
   - Ensure refs are properly cleaned up

2. Optimize audio handling:
   - Don't store all audio chunks
   - Process and discard immediately

3. Check database queries:
   - Ensure queries are efficient
   - Use indexes where needed

### Issue: Too many API calls

**Solutions:**
1. Implement rate limiting (future enhancement)
2. Batch requests where possible
3. Cache dictionary words
4. Monitor OpenAI usage dashboard

## Browser-Specific Issues

### Issue: Microphone not working in Chrome

**Solutions:**
1. Check permissions:
   - Go to `chrome://settings/content/microphone`
   - Ensure site has permission

2. Check HTTPS:
   - Microphone requires HTTPS in production
   - Use `localhost` for development

3. Check browser compatibility:
   - MediaRecorder API support varies
   - Use modern browser versions

### Issue: MediaRecorder not supported

**Symptoms:**
- Error: `MediaRecorder is not defined`

**Solutions:**
1. Check browser support:
   - Chrome/Edge: Supported
   - Firefox: Supported
   - Safari: Supported (iOS 14.3+)

2. Add fallback:
   - Use Web Speech API as fallback
   - Check `useWebSpeechAPI` state

### Issue: CORS errors

**Solutions:**
1. Check API routes:
   - Ensure CORS headers are set (if needed)
   - Verify request origins

2. Check middleware:
   - Ensure middleware allows API routes
   - Verify route matching

## Getting Help

If you're still experiencing issues:

1. **Check Logs:**
   - Browser console (F12)
   - Server logs (terminal or deployment platform)

2. **Verify Configuration:**
   - Environment variables
   - Database connection
   - API keys

3. **Test Components:**
   - Test API endpoints directly
   - Verify database queries
   - Check authentication flow

4. **Review Documentation:**
   - [API Documentation](./API.md)
   - [Architecture Overview](./ARCHITECTURE.md)
   - [Deployment Guide](./DEPLOYMENT.md)

5. **Common Debugging Steps:**
   ```bash
   # Check Prisma
   npx prisma validate
   npx prisma generate
   npx prisma studio
   
   # Check build
   npm run build
   npm run lint
   
   # Check database
   npx prisma db pull
   ```

## Error Code Reference

### API Error Codes

- `QUOTA_EXCEEDED`: OpenAI API quota exceeded
- `INVALID_API_KEY`: Invalid OpenAI API key
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User doesn't own resource
- `NOT_FOUND`: Resource not found

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error

## Prevention Tips

1. **Always test locally before deploying**
2. **Keep environment variables secure**
3. **Regularly backup database**
4. **Monitor API usage and costs**
5. **Keep dependencies updated**
6. **Review logs regularly**
7. **Test on multiple browsers**
8. **Verify environment variables after deployment**

