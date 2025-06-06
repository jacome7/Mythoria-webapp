# Mythoria

Mythoria is a web application that allows users to craft personalized, AI-powered stories. It's designed to bring imagination to life for kids, adults, and even companies, turning them into the heroes of their own unique adventures. Users can customize characters, choose from various story settings, and receive their story as a hardcover book, ebook, or audiobook.

## Project Description

Mythoria aims to foster a lifelong passion for reading and encourage imagination by providing an unforgettable experience where users become the central figures in their narratives.

**Key Features:**

*   **Personalized Story Creation:** Users can create stories featuring themselves, their children, grandchildren, or any special person.
*   **AI-Powered:** Leverages Artificial Intelligence to generate unique and engaging story content.
*   **Targeted Audiences:**
    *   **For Kids:** Create magical adventures where children are the heroes.
    *   **For Adults:** Bring personal memories and life adventures into book form, such as relationship stories or family chronicles.
    *   **For Companies:** Offer personalized storybooks to employees' children, uniquely highlighting the company brand.
*   **Easy Customization:**
    1.  Choose character(s).
    2.  Describe their passions and superpowers.
    3.  Optionally upload a photo or describe the characters.
    4.  Pick from over 20 story settings (e.g., enchanted castles, space missions).
    5.  Add unique details, including specific products, services, or family traditions.
    6.  Choose the gift format: hardcover book, digital ebook, or audiobook.
*   **Focus on Imagination and Reading:** Believes that reading and imagination are essential to growth and creativity.

## Tech Stack

Mythoria is built with a modern web development stack:

*   **Frontend:**
    *   [Next.js](https://nextjs.org/) (React framework)
    *   [React](https://reactjs.org/)
    *   [Tailwind CSS](https://tailwindcss.com/) (via `daisyui` for UI components)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   `react-type-animation` for animated text effects.
*   **Backend & Database:**
    *   [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
    *   [Drizzle ORM](https://orm.drizzle.team/) (TypeScript ORM for SQL databases)
    *   [PostgreSQL](https://www.postgresql.org/) (as inferred from `pg` and Drizzle usage)
*   **Authentication:**
    *   [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs) for user management and authentication
    *   Previously used Clerk (migrated to Auth0 for enhanced flexibility and enterprise features)
*   **Analytics:**
    *   [Google Analytics 4](https://analytics.google.com/) for user behavior tracking and insights
*   **Development & Tooling:**
    *   `eslint` for linting
    *   `drizzle-kit` for database schema migrations and studio.
    *   `dotenv` for environment variable management.

## Getting Started

### Prerequisites

- Node.js 20 or later
- PostgreSQL database
- Auth0 account
- Google Cloud Platform account (for production deployment)

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd mythoria-webapp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Auth0:**
   - Create an Auth0 account at [auth0.com](https://auth0.com)
   - Create a new Application (Single Page Application type)
   - Configure the following URLs in your Auth0 dashboard:
     - **Allowed Callback URLs:** `http://localhost:3000/api/auth/callback`
     - **Allowed Logout URLs:** `http://localhost:3000`
     - **Allowed Web Origins:** `http://localhost:3000`

4. **Configure environment variables:**
   - Copy `.env.example` to `.env.local`
   - Fill in your Auth0 configuration:
     ```bash
     AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32 bytes value'
     AUTH0_BASE_URL='http://localhost:3000'
     AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'
     AUTH0_CLIENT_ID='your-auth0-client-id'
     AUTH0_CLIENT_SECRET='your-auth0-client-secret'
     ```

5. **Set up the database:**
   ```bash
   npm run db:setup
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

### Auth0 Migration Notes

This project was migrated from Clerk to Auth0. Key changes include:
- Authentication provider updated from `@clerk/nextjs` to `@auth0/nextjs-auth0`
- User management adapted to Auth0's user profile structure
- Database field `clerkUserId` temporarily retained for backward compatibility (will be renamed in future migration)
- All authentication flows now use Auth0's standard endpoints (`/api/auth/login`, `/api/auth/logout`, `/api/auth/callback`)

For production deployment, ensure all Auth0 environment variables are properly configured in your deployment environment.

```
npm install
# (Further setup steps for database, .env, etc.)
npm run dev
```