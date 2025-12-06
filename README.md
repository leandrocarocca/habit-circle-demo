# Habit Circle

A modern habit tracking application built with Next.js 15, Mantine UI, and NextAuth.js.

## Features

- **Authentication**: Secure email/password authentication with NextAuth.js v5
- **Modern UI**: Beautiful, responsive interface built with Mantine UI components
- **App Router**: Built with Next.js 15 App Router for optimal performance
- **Database**: PostgreSQL database integration (Vercel Postgres compatible)
- **Responsive Design**: Mobile-friendly layout with collapsible sidebar

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: Mantine v8
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Database**: PostgreSQL (via Vercel Postgres)
- **Language**: TypeScript
- **Icons**: Tabler Icons

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Vercel account (for deployment and database)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd habit-circle-demo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

4. **Generate NextAuth secret**:
   ```bash
   openssl rand -base64 32
   ```

   Add this to your `.env.local` as `NEXTAUTH_SECRET`.

5. **Set up database** (see Database Setup section below)

6. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

### Using Vercel Postgres (Recommended for Production)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to the Storage tab
3. Create a new Postgres database
4. Copy the connection string (POSTGRES_URL)
5. Add it to your `.env.local` file

### Initialize Database Schema

Run the SQL commands from `schema.sql` in your Postgres database:

**Via Vercel Dashboard**:
1. Go to your Postgres database in Vercel
2. Click on the "Query" tab
3. Paste the contents of `schema.sql`
4. Execute the query

**Via psql or database client**:
```bash
psql <your-postgres-url> -f schema.sql
```

## Deployment to Vercel

### Deploy with Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Follow the prompts** to link your project and deploy.

### Deploy via GitHub

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy!

### Environment Variables for Production

In your Vercel project settings, add these environment variables:

- `POSTGRES_URL`: Your Vercel Postgres connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your production URL (e.g., `https://your-app.vercel.app`)

**Note**: Vercel will automatically populate `POSTGRES_URL` if you connect a Vercel Postgres database to your project.

## Project Structure

```
habit-circle-demo/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   └── signup/
│   │       └── page.tsx          # Signup page
│   ├── app/
│   │   ├── layout.tsx            # Authenticated app layout
│   │   └── page.tsx              # Main app page (Hello World)
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts      # NextAuth API routes
│   │   └── register/
│   │       └── route.ts          # User registration API
│   ├── layout.tsx                # Root layout with Mantine provider
│   └── page.tsx                  # Home page (redirects to /app or /login)
├── components/
│   ├── AppShellLayout.tsx        # App shell with navbar and sidebar
│   └── Providers.tsx             # Session provider wrapper
├── auth.ts                       # NextAuth configuration
├── schema.sql                    # Database schema
└── README.md
```

## Usage

1. **Sign Up**: Navigate to `/signup` to create a new account
2. **Login**: Use your credentials at `/login`
3. **App**: After login, you'll see the main app with navbar and sidebar
4. **Logout**: Click the "Sign out" button in the header

## Free Tier Compatibility

This project is designed to work entirely on Vercel's free tier:

- **Hosting**: Free deployment on Vercel
- **Database**: Vercel Postgres free tier (256 MB storage, 60 hours compute time/month)
- **Serverless Functions**: Included in Vercel free tier

## Extending the Application

The current setup provides:
- Complete authentication system
- App layout with navbar and sidebar
- Database schema ready for expansion
- Mantine UI components for rapid development

To add new features:
1. Add new pages in the `app/app/` directory
2. Create API routes in `app/api/`
3. Extend the database schema in `schema.sql`
4. Use Mantine components for consistent UI

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Mantine Documentation](https://mantine.dev/)
- [NextAuth.js Documentation](https://authjs.dev/)
- [Vercel Documentation](https://vercel.com/docs)

## Support

For issues or questions, please open an issue in the GitHub repository.
