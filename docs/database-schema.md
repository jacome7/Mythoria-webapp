# Database schema

Mythoria uses PostgreSQL with Drizzle ORM. The schema is defined in the `drizzle` folder and managed via migrations.

Main tables:

- **authors** – user accounts linked to Clerk `clerkUserId`.
- **stories** – story metadata and content.
- **characters** – characters that can appear in stories.
- **payments** – credit purchases and orders.

See the TypeScript models in `drizzle/schema.ts` for the full definition.
