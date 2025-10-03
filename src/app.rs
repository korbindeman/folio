use gpui::{App, Context, Entity, FocusHandle, Focusable, Window, div, prelude::*, white};

use crate::editor::TextEditor;

pub struct Main {
    pub text_editor: Entity<TextEditor>,
    focus_handle: FocusHandle,
}

impl Main {
    pub fn new(text_editor: Entity<TextEditor>, cx: &mut Context<Self>) -> Self {
        Self {
            text_editor,
            focus_handle: cx.focus_handle(),
        }
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
            .child(self.text_editor.clone())
    }
}
