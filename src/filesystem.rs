use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Clone)]
pub struct NoteMetadata {
    pub path: String,
    pub mtime: SystemTime,
}

#[derive(Debug)]
pub struct NoteFilesystem {
    root_path: PathBuf,
}

impl NoteFilesystem {
    pub fn new<P: AsRef<Path>>(root_path: P) -> io::Result<Self> {
        let root_path = root_path.as_ref().to_path_buf();
        fs::create_dir_all(&root_path)?;
        Ok(Self { root_path })
    }

    pub fn read_note(&self, path: &str) -> io::Result<String> {
        let fs_path = self.note_to_fs_path(path);
        fs::read_to_string(fs_path)
    }

    pub fn write_note(&self, path: &str, content: &str) -> io::Result<()> {
        let fs_path = self.note_to_fs_path(path);
        if let Some(parent) = fs_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(fs_path, content)
    }

    pub fn create_note(&self, path: &str) -> io::Result<()> {
        let fs_path = self.note_to_fs_path(path);
        if fs_path.exists() {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                "Note already exists",
            ));
        }
        if let Some(parent) = fs_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(fs_path, "")
    }

    pub fn delete_note(&self, path: &str) -> io::Result<()> {
        let dir_path = self.root_path.join(path);
        fs::remove_dir_all(dir_path)
    }

    pub fn scan_all(&self) -> io::Result<Vec<NoteMetadata>> {
        let mut notes = Vec::new();
        self.scan_dir(&self.root_path, "", &mut notes)?;
        Ok(notes)
    }

    pub fn get_parent_path(&self, path: &str) -> Option<String> {
        if path.is_empty() {
            return None;
        }

        let path = Path::new(path);
        path.parent()
            .filter(|p| p != &Path::new(""))
            .map(|p| p.to_string_lossy().to_string())
    }

    pub fn list_children(&self, path: &str) -> io::Result<Vec<String>> {
        let dir_path = self.root_path.join(path);

        if !dir_path.exists() {
            return Err(io::Error::new(io::ErrorKind::NotFound, "Note not found"));
        }

        let mut children = Vec::new();

        for entry in fs::read_dir(dir_path)? {
            let entry = entry?;
            let metadata = entry.metadata()?;
            let name = entry.file_name().to_string_lossy().to_string();

            if metadata.is_dir() {
                let child_path = if path.is_empty() {
                    name
                } else {
                    format!("{}/{}", path, name)
                };
                children.push(child_path);
            }
        }

        Ok(children)
    }

    fn note_to_fs_path(&self, path: &str) -> PathBuf {
        if path.is_empty() {
            self.root_path.join("_index.md")
        } else {
            self.root_path.join(path).join("_index.md")
        }
    }

    fn scan_dir(&self, dir: &Path, prefix: &str, notes: &mut Vec<NoteMetadata>) -> io::Result<()> {
        let index_path = dir.join("_index.md");
        if index_path.exists() {
            let metadata = fs::metadata(&index_path)?;
            let mtime = metadata.modified()?;
            notes.push(NoteMetadata {
                path: prefix.to_string(),
                mtime,
            });
        }

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let metadata = entry.metadata()?;

            if metadata.is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                let new_prefix = if prefix.is_empty() {
                    name.clone()
                } else {
                    format!("{}/{}", prefix, name)
                };
                self.scan_dir(&entry.path(), &new_prefix, notes)?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_create_and_read_note() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.create_note("test").unwrap();
        let content = fs.read_note("test").unwrap();
        assert_eq!(content, "");
    }

    #[test]
    fn test_write_and_read_note() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("test", "Hello, World!").unwrap();
        let content = fs.read_note("test").unwrap();
        assert_eq!(content, "Hello, World!");
    }

    #[test]
    fn test_create_nested_note() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.create_note("projects/rust").unwrap();
        let content = fs.read_note("projects/rust").unwrap();
        assert_eq!(content, "");
    }

    #[test]
    fn test_delete_note() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.create_note("test").unwrap();
        fs.delete_note("test").unwrap();
        assert!(fs.read_note("test").is_err());
    }

    #[test]
    fn test_delete_note_with_children() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("parent", "Parent content").unwrap();
        fs.write_note("parent/child", "Child content").unwrap();

        fs.delete_note("parent").unwrap();
        assert!(fs.read_note("parent").is_err());
        assert!(fs.read_note("parent/child").is_err());
    }

    #[test]
    fn test_scan_all() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("inbox", "Inbox content").unwrap();
        fs.write_note("projects", "Projects content").unwrap();
        fs.write_note("projects/rust-app", "Rust app content")
            .unwrap();

        let notes = fs.scan_all().unwrap();
        assert_eq!(notes.len(), 3);

        let paths: Vec<_> = notes.iter().map(|n| n.path.as_str()).collect();
        assert!(paths.contains(&"inbox"));
        assert!(paths.contains(&"projects"));
        assert!(paths.contains(&"projects/rust-app"));
    }

    #[test]
    fn test_get_parent_path() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        assert_eq!(fs.get_parent_path(""), None);
        assert_eq!(fs.get_parent_path("inbox"), None);
        assert_eq!(
            fs.get_parent_path("projects/rust-app"),
            Some("projects".to_string())
        );
        assert_eq!(
            fs.get_parent_path("projects/rust-app/architecture"),
            Some("projects/rust-app".to_string())
        );
    }

    #[test]
    fn test_list_children() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("parent", "Parent content").unwrap();
        fs.write_note("parent/child1", "Child 1").unwrap();
        fs.write_note("parent/child2", "Child 2").unwrap();

        let children = fs.list_children("parent").unwrap();
        assert_eq!(children.len(), 2);
        assert!(children.contains(&"parent/child1".to_string()));
        assert!(children.contains(&"parent/child2".to_string()));
    }

    #[test]
    fn test_special_characters_in_path() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("note-with-dashes", "Content").unwrap();
        let content = fs.read_note("note-with-dashes").unwrap();
        assert_eq!(content, "Content");

        fs.write_note("note_with_underscores", "Content").unwrap();
        let content = fs.read_note("note_with_underscores").unwrap();
        assert_eq!(content, "Content");
    }

    #[test]
    fn test_deep_nesting() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("a/b/c/d/e", "Deep content").unwrap();
        let content = fs.read_note("a/b/c/d/e").unwrap();
        assert_eq!(content, "Deep content");

        let parent = fs.get_parent_path("a/b/c/d/e");
        assert_eq!(parent, Some("a/b/c/d".to_string()));
    }

    #[test]
    fn test_read_nonexistent_note() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        assert!(fs.read_note("nonexistent").is_err());
    }

    #[test]
    fn test_create_duplicate_note() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.create_note("test").unwrap();
        assert!(fs.create_note("test").is_err());
    }

    #[test]
    fn test_scan_nested_structure() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("inbox", "Inbox").unwrap();
        fs.write_note("projects", "Projects").unwrap();
        fs.write_note("projects/rust-app", "Rust app").unwrap();
        fs.write_note("projects/rust-app/architecture", "Architecture")
            .unwrap();

        let notes = fs.scan_all().unwrap();
        assert_eq!(notes.len(), 4);
    }

    #[test]
    fn test_mtime_tracking() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("test", "Content").unwrap();
        let notes = fs.scan_all().unwrap();

        assert_eq!(notes.len(), 1);
        assert!(notes[0].mtime.elapsed().is_ok());
    }

    #[test]
    fn test_list_children_empty() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("parent", "Parent content").unwrap();
        let children = fs.list_children("parent").unwrap();
        assert_eq!(children.len(), 0);
    }

    #[test]
    fn test_root_note() {
        let temp_dir = TempDir::new().unwrap();
        let fs = NoteFilesystem::new(temp_dir.path()).unwrap();

        fs.write_note("", "Root content").unwrap();
        let content = fs.read_note("").unwrap();
        assert_eq!(content, "Root content");
    }
}
