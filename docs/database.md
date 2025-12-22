# Database

Mythoria uses PostgreSQL accessed through Drizzle ORM. The following diagram illustrates the logical data model.

```mermaid
erDiagram
    users {
        int id PK
        text email
        text name
    }
    stories {
        int id PK
        int user_id FK
        text title
        text content
    }
    users ||--o{ stories : has
```

### Table Definitions

- **users** – registered accounts with a unique email.
- **stories** – generated story records linked to the creating user.

Indexes and constraints are defined through Drizzle migrations.

### Recommended schema improvements

- **Indexes for hot paths**: add a unique index on `users.email` (enforce uniqueness and speed authentication lookups) and a non-unique index on `stories.user_id` to make user story listings O(log n) instead of scanning the whole table.
- **Timestamps and ordering**: include `created_at`/`updated_at` columns and default to `NOW()` so stories can be paginated efficiently with `ORDER BY created_at DESC` using the `stories(user_id, created_at DESC)` compound index.
- **Foreign-key hygiene**: mark `stories.user_id` as `NOT NULL` with `ON DELETE CASCADE` to prevent orphaned stories when a user is removed.
- **Content search**: if story content is queried by text, add a `GIN` index on a generated `to_tsvector('simple', title || ' ' || content)` column to accelerate full-text search.
- **Data limits**: set sensible length limits (e.g., `varchar(320)` for email, `varchar(256)` for titles) and use `text` for larger story bodies to keep indexes compact.
- **Auditing and ownership**: add a `status` enum and `visibility` flag if public/private sharing is required, with partial indexes (e.g., `CREATE INDEX stories_visible_idx ON stories (user_id) WHERE visibility = 'public';`) to speed filtered queries.
