use std::path::PathBuf;

/// Returns the default notes directory path based on platform and debug mode.
///
/// # Debug Mode
/// - All platforms: `~/Documents/notes-dev`
///
/// # Release Mode (Platform-specific)
/// - **macOS**: Attempts iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/notes`),
///   falls back to `~/Documents/notes`
/// - **Windows**: Attempts OneDrive (`~/OneDrive/notes`),
///   falls back to `~/Documents/notes`
/// - **Linux**: `~/.local/share/folio/notes`
///
/// # Arguments
/// * `debug` - Whether the application is running in debug mode
///
/// # Returns
/// `Some(PathBuf)` with the default notes path, or `None` if home directory cannot be determined.
pub fn get_default_notes_path(debug: bool) -> Option<PathBuf> {
    if debug {
        // Debug mode: use Documents/notes-dev on all platforms
        return dirs::document_dir().map(|mut p| {
            p.push("notes-dev");
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
            p.push("notes");
            p
        })
    }
}

#[cfg(target_os = "macos")]
fn get_macos_path() -> Option<PathBuf> {
    // Try iCloud Drive first
    if let Some(icloud_path) = get_icloud_path() {
        let mut notes_path = icloud_path;
        notes_path.push("notes");
        return Some(notes_path);
    }

    // Fallback to Documents
    dirs::document_dir().map(|mut p| {
        p.push("notes");
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
        notes_path.push("notes");
        return Some(notes_path);
    }

    // Fallback to Documents
    dirs::document_dir().map(|mut p| {
        p.push("notes");
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
    path.push("folio");
    path.push("notes");
    Some(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_debug_mode_returns_notes_dev() {
        let path = get_default_notes_path(true);
        assert!(path.is_some());
        let path_str = path.unwrap().to_string_lossy().to_string();
        assert!(path_str.contains("notes-dev"));
    }

    #[test]
    fn test_release_mode_returns_path() {
        let path = get_default_notes_path(false);
        assert!(path.is_some());
        let path_str = path.unwrap().to_string_lossy().to_string();
        assert!(path_str.contains("notes"));
        // Should not be the debug path
        assert!(!path_str.contains("notes-dev"));
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
        assert!(path_str.contains("folio"));
        assert!(path_str.contains("notes"));
    }
}
