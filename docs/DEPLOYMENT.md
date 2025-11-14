# Deployment Guide

This guide covers deploying the AI Voice Keyboard application to production. The recommended platform is Railway, but instructions for other platforms are also provided.

## Prerequisites

- GitHub account (for code repository)
- Railway account (or alternative hosting platform)
- OpenAI API key with access to Whisper API
- PostgreSQL database (provided by Railway or external)

## Deployment to Railway

Railway is the recommended platform as it provides PostgreSQL, easy environment variable management, and automatic deployments.

### Step 1: Prepare Your Repository

1. Ensure your code is pushed to a GitHub repository
2. Make sure your repository is public (or connect Railway to your private repo)

### Step 2: Create Railway Project

1. Go to [Railway](https://railway.app/)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will automatically detect it's a Next.js project

### Step 3: Set Up PostgreSQL Database

1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will create a PostgreSQL service
3. Click on the PostgreSQL service
4. Go to the "Connect" tab
5. Copy the **Connection URL** (looks like: `postgresql://user:password@host:port/database`)

### Step 4: Configure Environment Variables

1. In your Railway project, click on your web service
2. Go to the "Variables" tab
3. Add the following environment variables:

```env
DATABASE_URL=postgresql://user:password@host:port/database
OPENAI_API_KEY=sk-your-openai-api-key
LUCIA_SECRET=your-random-secret-key-min-32-chars
NODE_ENV=production
```

**Important Notes:**
- `DATABASE_URL`: Use the connection URL from Step 3
- `OPENAI_API_KEY`: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
  - **Must have access to `whisper-1` model** for audio transcription
  - **Must have access to at least one text-to-text model** for post-processing:
    - The app automatically uses the first available: `gpt-5-nano` → `gpt-4o-mini` → `gpt-4o` → `gpt-4-turbo` → `gpt-3.5-turbo`
- `LUCIA_SECRET`: Generate using `openssl rand -base64 32` (or Railway's generator)
- `NODE_ENV`: Set to `production`

### Step 5: Run Database Migrations

1. Railway will automatically run `npm run build` which includes Prisma generation
2. You need to run database migrations manually:

**Option A: Using Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npx prisma db push
```

**Option B: Using Railway Dashboard**
1. Go to your web service
2. Click "Deployments" → "Latest"
3. Open the terminal/console
4. Run: `npx prisma db push`

**Option C: Using Prisma Studio (for initial setup)**
```bash
railway run npx prisma studio
```

### Step 6: Verify Deployment

1. Railway will automatically deploy your application
2. Check the deployment logs for any errors
3. Once deployed, Railway will provide a URL (e.g., `https://your-app.railway.app`)
4. Visit the URL and test:
   - Sign up a new account
   - Test transcription
   - Verify database is working

### Step 7: Set Custom Domain (Optional)

1. In Railway, go to your web service
2. Click "Settings" → "Networking"
3. Add your custom domain
4. Configure DNS records as instructed by Railway

## Deployment to Vercel

Vercel is another excellent option for Next.js applications.

### Step 1: Prepare Repository

Same as Railway Step 1.

### Step 2: Create Vercel Project

1. Go to [Vercel](https://vercel.com/)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js settings

### Step 3: Set Up Database

Vercel doesn't provide PostgreSQL, so you'll need an external database:

**Option A: Railway PostgreSQL**
1. Create a PostgreSQL service on Railway (free tier available)
2. Copy the connection URL

**Option B: Supabase**
1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Get the connection URL from Settings → Database

**Option C: Neon**
1. Go to [Neon](https://neon.tech/)
2. Create a new project
3. Copy the connection URL

### Step 4: Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```env
DATABASE_URL=your-postgres-connection-url
OPENAI_API_KEY=sk-your-openai-api-key
LUCIA_SECRET=your-random-secret-key
NODE_ENV=production
```

**Note**: Ensure your `OPENAI_API_KEY` has access to:
- `whisper-1` model for transcription
- At least one text-to-text model for post-processing (app auto-detects available models)

### Step 5: Deploy

1. Vercel will automatically deploy
2. After deployment, run migrations:
   ```bash
   # Using Vercel CLI
   vercel env pull .env.local
   npx prisma db push
   ```

### Step 6: Run Migrations

You can run migrations using:
- Vercel CLI
- Prisma Studio
- Or add a migration script to your build process

## Deployment to Other Platforms

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

Update `next.config.ts`:

```typescript
const nextConfig = {
  output: 'standalone',
  // ... other config
};
```

### Environment-Specific Configuration

Create environment-specific configs:

**`.env.production`**
```env
DATABASE_URL=production-db-url
OPENAI_API_KEY=production-api-key
LUCIA_SECRET=production-secret
NODE_ENV=production
```

## Post-Deployment Checklist

- [ ] Database migrations completed successfully
- [ ] Environment variables set correctly
- [ ] Test user signup/login
- [ ] Test audio transcription
- [ ] Test dictionary feature
- [ ] Test transcription history
- [ ] Verify error handling (test with invalid API key)
- [ ] Check application logs for errors
- [ ] Test on mobile devices
- [ ] Verify HTTPS is enabled
- [ ] Set up monitoring/alerting (optional)

## Monitoring & Maintenance

### Application Logs

- **Railway**: View logs in the dashboard under "Deployments"
- **Vercel**: View logs in the dashboard under "Deployments" → "Functions"

### Database Maintenance

- Regularly backup your database
- Monitor database size and performance
- Set up alerts for connection issues

### OpenAI API Monitoring

- Monitor API usage in OpenAI dashboard
- Set up usage alerts
- Track costs and quotas

## Troubleshooting Deployment Issues

### Database Connection Errors

**Problem**: `Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` is correct
2. Check database is running and accessible
3. Verify network/firewall settings
4. Check database credentials

### Build Failures

**Problem**: Build fails during deployment

**Solutions**:
1. Check build logs for specific errors
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version compatibility
4. Check for TypeScript errors: `npm run lint`

### Environment Variable Issues

**Problem**: App works locally but not in production

**Solutions**:
1. Verify all environment variables are set
2. Check variable names match exactly (case-sensitive)
3. Ensure no trailing spaces in values
4. Restart deployment after adding variables

### Prisma Client Errors

**Problem**: `PrismaClient is not configured`

**Solutions**:
1. Ensure `npx prisma generate` runs during build
2. Check `DATABASE_URL` is set before Prisma generation
3. Verify Prisma schema is valid: `npx prisma validate`

## Scaling Considerations

### Horizontal Scaling

- Railway/Vercel handle horizontal scaling automatically
- Ensure database connection pooling is configured
- Use Prisma connection pooling (default)

### Database Scaling

- Monitor database performance
- Consider read replicas for high traffic
- Optimize queries (use indexes)
- Consider connection pooling services (PgBouncer)

### Cost Optimization

- Monitor OpenAI API usage
- Implement caching where possible
- Use database connection pooling
- Optimize bundle size (Next.js does this automatically)

## Security Checklist

- [ ] All environment variables are set (not hardcoded)
- [ ] HTTPS is enabled
- [ ] Database credentials are secure
- [ ] OpenAI API key is kept secret
- [ ] Session cookies are secure (httpOnly, secure in production)
- [ ] CORS is configured correctly (if needed)
- [ ] Rate limiting is considered (if needed)

## Support & Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

