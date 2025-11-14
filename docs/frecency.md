# Frecency-Based Navigation

## Overview

Zinnia uses a **frecency algorithm** to intelligently sort notes in the navigation. Frecency combines **frequency** (how often you access a note) and **recency** (how recently you accessed it) to surface the most relevant notes at the top of lists.

This creates a self-organizing navigation system that adapts to your workflow over time, making frequently-used notes easily accessible while still giving recent notes a temporary boost.

## How It Works

### What Counts as an Access

Frecency scores are updated when you:
- **Open/view** a note (`get_note()`)
- **Edit** a note (`save_note()`)

Creating, deleting, renaming, or archiving notes do **not** count as accesses.

### Score Calculation

The frecency score is calculated using this formula:

```
frecency_score = access_count × recency_bonus

where:
  recency_bonus = 100 / (days_since_access + 1)
```

**Examples:**

| Access Count | Last Accessed | Days Ago | Frecency Score |
|--------------|---------------|----------|----------------|
| 10           | Today         | 0        | ~1000          |
| 10           | 1 week ago    | 7        | ~125           |
| 10           | 1 month ago   | 30       | ~32            |
| 100          | 1 week ago    | 7        | ~1250          |
| 5            | Today         | 0        | ~500           |

**Key Properties:**
- Recent accesses receive a significant boost (up to 100× multiplier for same-day access)
- Frequently accessed notes maintain high scores over time
- Scores naturally decay as time passes without access
- A note accessed today will rank higher than one accessed last week, even if the latter has more total accesses

### Ancestor Propagation

When you access a note, the frecency score updates for:
1. **The note itself**
2. **All ancestor notes** (parent, grandparent, etc.)

This bubbles up frequently-accessed deep notes, making their parent directories more prominent in the navigation.

**Example:**

```
projects/
  rust/
    zinnia/
      architecture.md  ← You access this note
```

Frecency scores update for:
- `projects/rust/zinnia/architecture.md`
- `projects/rust/zinnia`
- `projects/rust`
- `projects`

This means if you frequently work on notes within `projects/rust/zinnia`, that entire path becomes more prominent.

## Database Schema

Frecency data is stored in the `notes` table with three additional columns:

```sql
CREATE TABLE notes (
    -- ... existing columns ...
    access_count INTEGER DEFAULT 0,
    last_accessed_at INTEGER,        -- Unix timestamp
    frecency_score REAL DEFAULT 0,
    -- ...
);

CREATE INDEX idx_frecency_score ON notes(frecency_score DESC);
```

### Migration

The frecency system was added in database schema **version 2**. When you upgrade:
- Existing notes start with `frecency_score = 0`
- Scores build up naturally as you use the app
- No data migration required

## Sorting Behavior

Notes are sorted using:

```sql
ORDER BY frecency_score DESC, path ASC
```

This means:
1. **Primary sort**: Highest frecency score first
2. **Fallback**: Alphabetical by path (for notes with equal scores)

### Where Sorting Applies

Frecency-based sorting is used in:
- **Root notes list** (`get_root_notes()`)
- **Children of any note** (`get_children()`)
- **Navigation breadcrumb dropdowns**

Frecency does **not** affect:
- Search results (still sorted by relevance/match quality)
- Archived notes
- Ancestors list (always ordered root → leaf)

## Real-Time Updates

The navigation updates **immediately** when frecency scores change.

### Event Flow

1. User accesses a note (opens or edits)
2. Backend updates frecency scores in database
3. Backend emits `notes:frecency` event to frontend
4. Frontend components receive event and refresh
5. Navigation re-sorts with new order

### Components That Update

- **Navigation breadcrumbs**: Dropdown menus refresh
- **Root notes**: Main navigation refreshes
- **Children lists**: All child note lists refresh
- **DropdownMenu**: Cache is cleared to force refetch

## Implementation Details

### Core API (`zinnia_core`)

**Key Methods:**

```rust
// Internal methods (not public API)
fn record_access(&mut self, path: &str) -> Result<()>
fn update_frecency(&mut self, path: &str, access_time: i64) -> Result<()>
fn calculate_frecency_score(access_count: i64, last_accessed_at: Option<i64>) -> f64

// Public API for setting callback
pub fn set_frecency_callback<F>(&mut self, callback: F)
where
    F: Fn() + Send + Sync + 'static
```

**Callback System:**

The `NotesApi` struct includes an optional callback that fires whenever frecency scores update:

```rust
pub struct NotesApi {
    // ...
    frecency_callback: Option<Arc<dyn Fn() + Send + Sync>>,
}
```

This allows frontends (like Tauri) to be notified of score changes without coupling the core library to any specific UI framework.

### Tauri Integration

**Setup:**

```rust
// Set callback to emit Tauri events
api.set_frecency_callback(move || {
    app_handle.emit("notes:frecency", ()).ok();
});
```

**Frontend Listeners:**

```typescript
// Listen for frecency updates
await listen("notes:frecency", () => {
    // Refresh navigation
    refetchChildren();
    refetchRootNotes();
});
```

## Performance Considerations

### Pre-computed Scores

Frecency scores are **pre-computed** and stored in the database, not calculated at query time. This means:
- ✅ Queries are fast (simple `ORDER BY` on indexed column)
- ✅ No expensive calculations during navigation
- ✅ Sorting happens in the database, not in application code

### When Scores Update

Scores update only when notes are accessed, not when:
- Browsing navigation (no access)
- Hovering over notes
- The watcher detects external changes

### Database Performance

- The `frecency_score` column is indexed for fast sorting
- Updates are transactional and use prepared statements
- Ancestor propagation typically updates 2-5 rows per access

## Configuration

Currently, the frecency algorithm uses hard-coded values:

```rust
let recency_bonus = 100.0 / (days_since_access + 1.0);
```

**Future Enhancements:**

These could be made configurable:
- Recency multiplier (currently `100.0`)
- Decay function (currently linear `1 / (days + 1)`)
- Whether to track views vs. edits separately
- Minimum score threshold for display

## Testing

The frecency system includes comprehensive tests:

```bash
# Run frecency-specific tests
cargo test -p zinnia_core frecency

# All tests
cargo test -p zinnia_core
```

**Test Coverage:**
- Score calculation with various time ranges
- Access tracking on `get_note()` and `save_note()`
- Ancestor propagation
- Sorting behavior
- Multiple accesses incrementing count

## Troubleshooting

### Navigation Not Updating

If navigation doesn't update after accessing notes:

1. **Check browser console** for `notes:frecency` event logs
2. **Verify backend** is emitting events (check Rust console)
3. **Clear cache** by restarting the app
4. **Database check**: Verify `frecency_score` column exists

### Unexpected Sort Order

If notes appear in unexpected order:

1. **Check scores directly** in the database:
   ```sql
   SELECT path, access_count, last_accessed_at, frecency_score 
   FROM notes 
   ORDER BY frecency_score DESC;
   ```

2. **Consider recency effect**: A recently-accessed note with few accesses can rank higher than an old note with many accesses

3. **Remember propagation**: Parent notes inherit scores from children

### Resetting Frecency Scores

To reset all frecency data:

```sql
UPDATE notes SET 
    access_count = 0,
    last_accessed_at = NULL,
    frecency_score = 0;
```

Or delete the database file (`.notes.db`) to start fresh (this will rebuild on next launch).

## Privacy & Data

Frecency data is stored **locally only** in the SQLite database at `<notes_root>/.notes.db`.

**What is tracked:**
- Number of times each note was accessed
- Timestamp of last access
- Calculated frecency score

**What is NOT tracked:**
- Note content (only paths)
- Time spent reading
- External file access
- Network activity

All data stays on your device and is never transmitted anywhere.

## Future Enhancements

Potential improvements to the frecency system:

1. **Time-based decay**: Gradually reduce old scores even without new accesses
2. **Access history**: Store last N access timestamps for more sophisticated calculations
3. **Weighted access types**: Views vs. edits could have different weights
4. **Boost new notes**: Temporarily boost newly-created notes
5. **Context awareness**: Different scores for different projects/contexts
6. **Configurable algorithm**: Allow users to tune frecency parameters
7. **Statistics UI**: Show most-accessed notes, access patterns over time

## References

- **Firefox Frecency**: [Mozilla's frecency algorithm](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/Places/Frecency_algorithm) (inspiration)
- **Database schema**: See `crates/core/src/notes.rs` migration v2
- **Tests**: See `crates/core/src/notes.rs` test module
