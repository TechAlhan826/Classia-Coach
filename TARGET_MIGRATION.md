# Target Model Migration

## Overview
The Target model has been updated to include `user_id` field for better data isolation and security. This ensures that each user can only access their own targets.

## Changes Made

### 1. Target Model (`src/models/Target.js`)
- Added `user_id` field as a required String field (matching User model)
- Updated unique index from `{ date: 1 }` to `{ user_id: 1, date: 1 }` to ensure uniqueness per user per date

### 2. Target Controller (`src/controllers/targetController.js`)
- Updated `bulkUpsertTargets` to include `user_id` from authentication middleware
- Updated `updateTarget` to filter by both `_id` and `user_id`
- Updated `deleteTarget` to filter by both `_id` and `user_id`
- Updated `getTargetsByDateRange` to filter by `user_id`

### 3. Target Routes (`src/routes/target.js`)
- Added authentication middleware to all target routes

### 4. Report Controller (`src/controllers/reportController.js`)
- Updated Target.find query to include `user_id` filtering

### 5. Plan Controller (`src/controllers/planController.js`)
- Updated Target.find query to include `user_id` filtering

### 6. Plan Routes (`src/routes/plan.js`)
- Added authentication middleware to plan routes

## Migration

### Running the Migration
If you have existing targets in your database without `user_id`, run the migration script:

```bash
node migrate_targets.js
```

**Warning**: This script will delete all targets that don't have a `user_id` field. If you need to preserve these targets, manually assign them to specific users before running the migration.

### What the Migration Does
1. Finds all targets without `user_id` field
2. Deletes them (since they cannot be associated with any user)
3. Logs the number of deleted targets

## API Changes

### Authentication Required
All target-related endpoints now require authentication:
- `POST /targets/bulk` - Add/update targets
- `PUT /targets/:id` - Update target
- `DELETE /targets/:id` - Delete target
- `GET /targets` - Get targets by date range
- `GET /plans` - Get plan data

### Request Headers
All requests must include the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Response Changes
- Targets are now filtered by the authenticated user
- Users can only access their own targets
- The unique constraint ensures one target per user per date

## Data Type Consistency
- `user_id` is stored as a **String** type (not ObjectId)
- This matches the User model and other models in the application
- The JWT token contains the user_id as a string

## Testing

After running the migration, test the following:

1. **Authentication**: Ensure all target endpoints require valid JWT tokens
2. **User Isolation**: Verify that users can only access their own targets
3. **Data Integrity**: Confirm that targets are properly associated with users
4. **Unique Constraints**: Test that duplicate targets for the same user and date are handled correctly

## Rollback (if needed)

If you need to rollback these changes:

1. Remove the `user_id` field from the Target schema
2. Update the unique index back to `{ date: 1 }`
3. Remove `user_id` filtering from all controller methods
4. Remove authentication middleware from routes
5. Restore any deleted targets from your database backup 