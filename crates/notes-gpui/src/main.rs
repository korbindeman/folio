mod actions;
mod app;
mod service;
mod ui;

use gpui::{App, AppContext, Application, Focusable, KeyBinding, WindowOptions};

use crate::actions::*;
use crate::app::Main;
use crate::service::NotesService;
use crate::ui::editor::TextEditor;

fn main() {
    Application::new().run(|cx: &mut App| {
        cx.bind_keys([
            KeyBinding::new("backspace", Backspace, None),
            KeyBinding::new("delete", Delete, None),
            KeyBinding::new("left", Left, None),
            KeyBinding::new("right", Right, None),
            KeyBinding::new("up", Up, None),
            KeyBinding::new("down", Down, None),
            KeyBinding::new("shift-left", SelectLeft, None),
            KeyBinding::new("shift-right", SelectRight, None),
            KeyBinding::new("cmd-a", SelectAll, None),
            KeyBinding::new("cmd-v", Paste, None),
            KeyBinding::new("cmd-c", Copy, None),
            KeyBinding::new("cmd-x", Cut, None),
            KeyBinding::new("home", Home, None),
            KeyBinding::new("end", End, None),
            KeyBinding::new("enter", Enter, None),
            KeyBinding::new("ctrl-cmd-space", ShowCharacterPalette, None),
        ]);

        let notes_root = dirs::home_dir().unwrap().join(".my-notes");

        let service = {
            let service =
                NotesService::new(notes_root).expect("Failed to initialize notes service");

            service
        };

        cx.set_global(service);

        let window = cx
            .open_window(
                WindowOptions {
                    ..Default::default()
                },
                |_, cx| {
                    let service = cx.global::<NotesService>();
                    let note_content = service.get_note("hello").unwrap().content.clone();
                    let text_editor =
                        cx.new(|cx| TextEditor::new(cx.focus_handle(), note_content.into()));
                    cx.new(|cx| Main::new(text_editor, "hello".into(), cx))
                },
            )
            .unwrap();
        cx.on_keyboard_layout_change({
            move |cx| {
                window.update(cx, |_, _, cx| cx.notify()).ok();
            }
        })
        .detach();

        window
            .update(cx, |view, window, cx| {
                window.focus(&view.text_editor.focus_handle(cx));
                cx.activate(true);
            })
            .unwrap();
        cx.on_action(|_: &Quit, cx| cx.quit());
        cx.bind_keys([KeyBinding::new("cmd-q", Quit, None)]);
    });
}
