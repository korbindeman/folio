use gpui::{Context, Window, div, prelude::*};

use crate::notes::NoteMetadata;

pub struct Breadcrumb {
    notes: Vec<NoteMetadata>,
}

impl Breadcrumb {
    pub fn new(notes: Vec<NoteMetadata>) -> Self {
        Self { notes }
    }
}

impl Render for Breadcrumb {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div().flex().w_full().items_center().child(format!(
            "> {} +",
            &self
                .notes
                .iter()
                .map(|note| note.path.clone())
                .collect::<Vec<String>>()
                .join(" > ")
        ))
    }
}
