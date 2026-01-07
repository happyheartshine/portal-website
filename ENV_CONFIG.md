# Environment Configuration Guide

This document describes the environment variables needed for both frontend and backend.

## Frontend Configuration (.env.local)

Create a `.env.local` file in the project root with the following variables:

```env
# Backend API URL
# Default: http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080

# Environment
# Options: development | production
NODE_ENV=development
```

## Backend Configuration (src/api/.env)

Create a `.env` file in the `src/api` directory with the following variables:

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Database Configuration
# PostgreSQL connection string
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://postgres:password@localhost:5432/portal_db?schema=public"

# JWT Configuration
# Generate a strong secret key for production (e.g., using openssl rand -base64 32)
JWT_SECRET="your-secret-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email Configuration (for password reset)
# Set to 'smtp' for production, 'console' for development
EMAIL_PROVIDER="console"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM="noreply@example.com"

# Storage Configuration
# Local storage path for file uploads
UPLOAD_PATH="./uploads"
```

## Quick Start

1. **Frontend Setup:**
   ```bash
   # In project root
   cp ENV_CONFIG.md .env.local
   # Edit .env.local with your values
   ```

2. **Backend Setup:**
   ```bash
   # In src/api directory
   cd src/api
   # Create .env file with the above configuration
   # Edit .env with your values
   ```

3. **Database Setup:**
   ```bash
   cd src/api
   npx prisma migrate dev
   npx prisma db seed
   ```

## Important Notes

- Never commit `.env` or `.env.local` files to version control
- Always use strong, randomly generated secrets for `JWT_SECRET` in production
- The `JWT_EXPIRES_IN` is set to 15 minutes for security; adjust based on your needs
- The `JWT_REFRESH_EXPIRES_IN` is set to 7 days; refresh tokens allow users to stay logged in
- In development, email provider is set to 'console' (logs to terminal)
- In production, configure SMTP settings for actual email delivery

## Security Best Practices

1. **JWT_SECRET**: Generate using `openssl rand -base64 32`
2. **DATABASE_URL**: Use environment-specific databases (dev, staging, prod)
3. **CORS**: Set `FRONTEND_URL` to your actual frontend domain in production
4. **HTTPS**: Always use HTTPS in production
5. **Token Expiry**: Balance security vs. user experience when setting token expiry times

