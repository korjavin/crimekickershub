# Database Migrations

This directory contains database migration files that are automatically applied when the application starts.

## How It Works

1. **Automatic Migration**: On application startup, the migration runner checks which migrations have been applied and runs any pending ones.

2. **Migration Tracking**: Applied migrations are tracked in the `schema_migrations` table with their version number and timestamp.

3. **Embedded Files**: Migration files are embedded into the Go binary using `//go:embed`, so you don't need to deploy SQL files separately.

## Migration File Naming

Migration files must follow this naming pattern:

```
<VERSION>_<NAME>.sql
```

Examples:
- `001_initial.sql` - Initial schema (version 1)
- `002_split_entity_descriptions.sql` - Add base_prompt field (version 2)
- `003_add_user_roles.sql` - Future migration (version 3)

**Important**:
- Version numbers must be integers
- Versions must be unique
- Migrations are applied in version order

## Creating a New Migration

1. Create a new SQL file in this directory with the next version number:
   ```bash
   touch internal/migrations/003_my_feature.sql
   ```

2. Write your SQL migration:
   ```sql
   -- Add your schema changes here
   ALTER TABLE users ADD COLUMN last_login DATETIME;

   -- Create indexes
   CREATE INDEX idx_users_last_login ON users(last_login);
   ```

3. Commit the file - it will be automatically applied on next deployment

## Migration Guidelines

- **Idempotent when possible**: Use `IF NOT EXISTS` clauses where appropriate
- **Test migrations**: Test on a copy of production data before deploying
- **One-way migrations**: This system doesn't support rollbacks - plan migrations carefully
- **Data migrations**: If migrating data, ensure the migration can handle large datasets

## Checking Migration Status

Migrations are logged during application startup:

```
2025-12-31 00:22:00 Applying migration 001_initial...
2025-12-31 00:22:00 ✓ Migration 001_initial applied successfully
2025-12-31 00:22:00 Applying migration 002_split_entity_descriptions...
2025-12-31 00:22:00 ✓ Migration 002_split_entity_descriptions applied successfully
2025-12-31 00:22:00 All migrations up to date (2 total)
```

You can also query the database directly:

```sql
SELECT * FROM schema_migrations ORDER BY version;
```

## Troubleshooting

**Migration failed during deployment:**
- Check the application logs for the specific SQL error
- The failed migration will be rolled back automatically (transaction)
- Fix the SQL and redeploy - the migration will retry

**Need to manually apply a migration:**
```bash
sqlite3 data/crime-kickers.db < internal/migrations/002_split_entity_descriptions.sql
```

**Reset all migrations (DANGER - development only):**
```sql
DROP TABLE schema_migrations;
-- Then restart the application
```
