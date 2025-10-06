use std::sync::Arc;

use gpui::{
    App, Context, Entity, FocusHandle, Focusable, Subscription, Window, div, prelude::*, white,
};

use crate::actions::ContentChanged;
use crate::filesystem::NoteFilesystem;
use crate::ui::breadcrumb::Breadcrumb;
use crate::ui::editor::TextEditor;

pub struct Main {
    pub text_editor: Entity<TextEditor>,
    focus_handle: FocusHandle,
    filesystem: Arc<NoteFilesystem>,
    current_note_path: String,
    is_dirty: bool,
    _subscriptions: Vec<Subscription>,
    breadcrumb: Entity<Breadcrumb>,
}

impl Main {
    pub fn new(
        text_editor: Entity<TextEditor>,
        filesystem: Arc<NoteFilesystem>,
        current_note_path: String,
        cx: &mut Context<Self>,
    ) -> Self {
        let subscription = cx.subscribe(&text_editor, Self::on_text_editor_event);

        let ancestors = filesystem.get_ancestors(&current_note_path);

        Self {
            text_editor,
            focus_handle: cx.focus_handle(),
            filesystem,
            current_note_path,
            is_dirty: false,
            _subscriptions: vec![subscription],
            breadcrumb: cx.new(|_cx| Breadcrumb::new(ancestors)),
        }
    }

    fn on_text_editor_event(
        &mut self,
        _editor: Entity<TextEditor>,
        _event: &ContentChanged,
        cx: &mut Context<Self>,
    ) {
        self.is_dirty = true;

        // Immediate save for now (can add debouncing later)
        let content = self.text_editor.read(cx).content().to_string();
        let filesystem = self.filesystem.clone();
        let note_path = self.current_note_path.clone();

        cx.background_executor()
            .spawn(async move {
                let _ = filesystem.write_note(&note_path, &content);
            })
            .detach();

        self.is_dirty = false;
    }
}

impl Focusable for Main {
    fn focus_handle(&self, _: &App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

impl Render for Main {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .size_full()
            .bg(white())
            .child(self.breadcrumb.clone())
            .child(self.text_editor.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use gpui::TestAppContext;
    use tempfile::TempDir;

    #[gpui::test]
    async fn test_dirty_flag_set_on_change(cx: &mut TestAppContext) {
        let temp_dir = TempDir::new().unwrap();
        let fs = Arc::new(NoteFilesystem::new(temp_dir.path()).unwrap());
        let note_path = "test-note".to_string();

        fs.write_note(&note_path, "initial").unwrap();

        let (main, editor) = cx.update(|cx| {
            let text_editor = cx.new(|cx| TextEditor::new(cx.focus_handle(), "initial".into()));
            let main =
                cx.new(|cx| Main::new(text_editor.clone(), fs.clone(), note_path.clone(), cx));
            (main, text_editor)
        });

        // Initially should not be dirty
        let is_dirty = cx.update(|cx| main.read(cx).is_dirty);
        assert!(!is_dirty);

        // Emit content changed event
        cx.update(|cx| {
            editor.update(cx, |_, cx| {
                cx.emit(ContentChanged);
            });
        });

        // After save completes, dirty flag should be cleared
        cx.background_executor.run_until_parked();
        let is_dirty = cx.update(|cx| main.read(cx).is_dirty);
        assert!(!is_dirty);
    }
}
