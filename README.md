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
    *   NextAuth.js for user management and authentication.
*   **Analytics:**
    *   [Google Analytics 4](https://analytics.google.com/) for user behavior tracking and insights
*   **Development & Tooling:**
    *   `eslint` for linting
    *   `drizzle-kit` for database schema migrations and studio.
    *   `dotenv` for environment variable management.

## Getting Started

(Instructions on how to set up and run the project locally would go here - e.g., cloning, installing dependencies, setting up .env, running database migrations, and starting the development server.)

```
npm install
# (Further setup steps for database, .env, etc.)
npm run dev
```
