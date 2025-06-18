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
