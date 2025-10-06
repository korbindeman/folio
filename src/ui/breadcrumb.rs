use gpui::{Context, SharedString, Window, div, prelude::*};

pub struct Breadcrumb {
    notes: Vec<SharedString>,
}

impl Breadcrumb {
    pub fn new(notes: Vec<String>) -> Self {
        Self {
            notes: notes.iter().map(|note| note.into()).collect(),
        }
    }
}

impl Render for Breadcrumb {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .flex()
            .w_full()
            .items_center()
            .child(format!("> {} +", &self.notes.join(" > ")))
    }
}
