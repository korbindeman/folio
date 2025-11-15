use std::fs;
use std::path::PathBuf;

/// Returns the default notes directory path based on platform and debug mode.
///
/// # Debug Mode
/// - All platforms: `~/Documents/Zinnia-dev`
///
/// # Release Mode (Platform-specific)
/// - **macOS**: Attempts iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/Zinnia`),
///   falls back to `~/Documents/Zinnia`
/// - **Windows**: Attempts OneDrive (`~/OneDrive/Zinnia`),
///   falls back to `~/Documents/Zinnia`
/// - **Linux**: `~/.local/share/zinnia/Zinnia`
///
/// # Arguments
/// * `debug` - Whether the application is running in debug mode
///
/// # Returns
/// `Some(PathBuf)` with the default notes path, or `None` if home directory cannot be determined.
pub fn get_default_notes_path(debug: bool) -> Option<PathBuf> {
    if debug {
        // Debug mode: use Documents/Zinnia-dev on all platforms
        return dirs::document_dir().map(|mut p| {
            p.push("Zinnia-dev");
            p
        });
    }

    // Release mode: platform-specific paths
    #[cfg(target_os = "macos")]
    {
        get_macos_path()
    }

    #[cfg(target_os = "windows")]
    {
        get_windows_path()
    }

    #[cfg(target_os = "linux")]
    {
        get_linux_path()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        // Fallback for other platforms
        dirs::document_dir().map(|mut p| {
            p.push("Zinnia");
            p
        })
    }
}

#[cfg(target_os = "macos")]
fn get_macos_path() -> Option<PathBuf> {
    // Try iCloud Drive first
    if let Some(icloud_path) = get_icloud_path() {
        let mut notes_path = icloud_path;
        notes_path.push("Zinnia");
        return Some(notes_path);
    }

    // Fallback to Documents
    dirs::document_dir().map(|mut p| {
        p.push("Zinnia");
        p
    })
}

#[cfg(target_os = "macos")]
fn get_icloud_path() -> Option<PathBuf> {
    let mut path = dirs::home_dir()?;
    path.push("Library");
    path.push("Mobile Documents");
    path.push("com~apple~CloudDocs");

    // Verify the path exists before returning it
    if path.exists() { Some(path) } else { None }
}

#[cfg(target_os = "windows")]
fn get_windows_path() -> Option<PathBuf> {
    // Try OneDrive first
    if let Some(onedrive_path) = get_onedrive_path() {
        let mut notes_path = onedrive_path;
        notes_path.push("Zinnia");
        return Some(notes_path);
    }

    // Fallback to Documents
    dirs::document_dir().map(|mut p| {
        p.push("Zinnia");
        p
    })
}

#[cfg(target_os = "windows")]
fn get_onedrive_path() -> Option<PathBuf> {
    use std::env;

    // Try the OneDrive environment variable
    if let Ok(onedrive) = env::var("OneDrive") {
        let path = PathBuf::from(onedrive);
        if path.exists() {
            return Some(path);
        }
    }

    // Try OneDriveCommercial for business accounts
    if let Ok(onedrive) = env::var("OneDriveCommercial") {
        let path = PathBuf::from(onedrive);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

#[cfg(target_os = "linux")]
fn get_linux_path() -> Option<PathBuf> {
    // Use XDG data directory standard
    let mut path = dirs::data_local_dir()?;
    path.push("zinnia");
    path.push("Zinnia");
    Some(path)
}

/// Returns the legacy (pre-0.4.0) notes directory path for migration purposes.
///
/// # Arguments
/// * `debug` - Whether the application is running in debug mode
///
/// # Returns
/// `Some(PathBuf)` with the legacy notes path, or `None` if home directory cannot be determined.
fn get_legacy_notes_path(debug: bool) -> Option<PathBuf> {
    if debug {
        return dirs::document_dir().map(|mut p| {
            p.push("notes-dev");
            p
        });
    }

    #[cfg(target_os = "macos")]
    {
        get_legacy_macos_path()
    }

    #[cfg(target_os = "windows")]
    {
        get_legacy_windows_path()
    }

    #[cfg(target_os = "linux")]
    {
        get_legacy_linux_path()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        dirs::document_dir().map(|mut p| {
            p.push("notes");
            p
        })
    }
}

#[cfg(target_os = "macos")]
fn get_legacy_macos_path() -> Option<PathBuf> {
    if let Some(icloud_path) = get_icloud_path() {
        let mut notes_path = icloud_path;
        notes_path.push("notes");
        return Some(notes_path);
    }

    dirs::document_dir().map(|mut p| {
        p.push("notes");
        p
    })
}

#[cfg(target_os = "windows")]
fn get_legacy_windows_path() -> Option<PathBuf> {
    if let Some(onedrive_path) = get_onedrive_path() {
        let mut notes_path = onedrive_path;
        notes_path.push("notes");
        return Some(notes_path);
    }

    dirs::document_dir().map(|mut p| {
        p.push("notes");
        p
    })
}

#[cfg(target_os = "linux")]
fn get_legacy_linux_path() -> Option<PathBuf> {
    let mut path = dirs::data_local_dir()?;
    path.push("zinnia");
    path.push("notes");
    Some(path)
}

/// Attempts to migrate notes from the legacy path to the new Zinnia path.
///
/// This function checks if:
/// 1. The legacy path exists and contains notes
/// 2. The new Zinnia path doesn't exist yet
///
/// If both conditions are met, it copies the legacy directory to the new location,
/// then moves the original legacy directory to trash.
/// This is a one-time migration that happens automatically on first run after upgrade.
///
/// # Arguments
/// * `debug` - Whether the application is running in debug mode
///
/// # Returns
/// * `Ok(true)` - Migration was performed successfully
/// * `Ok(false)` - No migration needed (legacy path doesn't exist or new path already exists)
/// * `Err(std::io::Error)` - Migration failed
pub fn migrate_legacy_notes_path(debug: bool) -> std::io::Result<bool> {
    let Some(legacy_path) = get_legacy_notes_path(debug) else {
        return Ok(false);
    };

    let Some(new_path) = get_default_notes_path(debug) else {
        return Ok(false);
    };

    // Only migrate if legacy path exists and new path doesn't
    if !legacy_path.exists() || new_path.exists() {
        return Ok(false);
    }

    // Ensure parent directory exists for the new path
    if let Some(parent) = new_path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Copy the directory recursively
    copy_dir_all(&legacy_path, &new_path)?;

    // Rename the legacy directory to notes-legacy before trashing
    let legacy_renamed = if let Some(parent) = legacy_path.parent() {
        parent.join("notes-legacy")
    } else {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Failed to determine parent directory for legacy path",
        ));
    };

    fs::rename(&legacy_path, &legacy_renamed)?;

    // Move the renamed directory to trash
    trash::delete(&legacy_renamed).map_err(|e| {
        std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Failed to move legacy notes to trash: {}", e),
        )
    })?;

    Ok(true)
}

/// Recursively copies a directory and all its contents.
///
/// # Arguments
/// * `src` - Source directory path
/// * `dst` - Destination directory path
///
/// # Returns
/// * `Ok(())` - Copy succeeded
/// * `Err(std::io::Error)` - Copy failed
fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if file_type.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_debug_mode_returns_notes_dev() {
        let path = get_default_notes_path(true);
        assert!(path.is_some());
        let path_str = path.unwrap().to_string_lossy().to_string();
        assert!(path_str.contains("Zinnia-dev"));
    }

    #[test]
    fn test_release_mode_returns_path() {
        let path = get_default_notes_path(false);
        assert!(path.is_some());
        let path_str = path.unwrap().to_string_lossy().to_string();
        assert!(path_str.contains("Zinnia"));
        // Should not be the debug path
        assert!(!path_str.contains("Zinnia-dev"));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn test_macos_icloud_path_format() {
        if let Some(icloud) = get_icloud_path() {
            let path_str = icloud.to_string_lossy().to_string();
            assert!(path_str.contains("Library"));
            assert!(path_str.contains("Mobile Documents"));
            assert!(path_str.contains("com~apple~CloudDocs"));
        }
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_linux_path_uses_xdg() {
        let path = get_linux_path();
        assert!(path.is_some());
        let path_str = path.unwrap().to_string_lossy().to_string();
        assert!(path_str.contains("zinnia"));
        assert!(path_str.contains("Zinnia"));
    }

    #[test]
    fn test_migration_with_temp_dirs() {
        use std::fs;
        use tempfile::TempDir;

        let temp = TempDir::new().unwrap();
        let temp_path = temp.path();

        // Create a mock legacy directory (using "notes" as the original name)
        let legacy_dir = temp_path.join("notes");
        fs::create_dir(&legacy_dir).unwrap();

        // Create a test file in the legacy directory
        let test_file = legacy_dir.join("_index.md");
        fs::write(&test_file, "# Test Note").unwrap();

        // Create the new directory path
        let new_dir = temp_path.join("Zinnia");

        // Manually perform the migration logic (since we can't override paths in the function)
        assert!(legacy_dir.exists());
        assert!(!new_dir.exists());

        copy_dir_all(&legacy_dir, &new_dir).unwrap();

        // Verify new directory exists with correct content
        assert!(new_dir.exists());
        assert!(new_dir.join("_index.md").exists());
        let content = fs::read_to_string(new_dir.join("_index.md")).unwrap();
        assert_eq!(content, "# Test Note");

        // Rename the legacy directory to notes-legacy
        let legacy_renamed = temp_path.join("notes-legacy");
        fs::rename(&legacy_dir, &legacy_renamed).unwrap();

        // Verify the original directory is gone and renamed directory exists
        assert!(!legacy_dir.exists());
        assert!(legacy_renamed.exists());
        assert_eq!(
            fs::read_to_string(legacy_renamed.join("_index.md")).unwrap(),
            "# Test Note"
        );

        // Note: We don't test the actual trash operation to avoid filling the system trash
        // The trash::delete() call is tested in production use
    }
}
