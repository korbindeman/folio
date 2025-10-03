mod actions;
mod app;
mod editor;
mod filesystem;

use std::env;
use std::path::PathBuf;

use gpui::{App, AppContext, Application, Focusable, KeyBinding, WindowOptions};

use crate::actions::*;
use crate::app::Main;
use crate::editor::TextEditor;
use crate::filesystem::NoteFilesystem;

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

        // Get the user's home directory
        let home = env::var("HOME").expect("HOME environment variable not set");

        // Create path to documents/notes
        let notes_path = PathBuf::from(home).join("Documents").join("notes");

        // Initialize the filesystem - this creates the directory if it doesn't exist
        let fs = NoteFilesystem::new(&notes_path).unwrap();

        // Now you can use it
        fs.write_note("hello", "My first note").unwrap();

        let content = fs.read_note("hello").unwrap();

        let window = cx
            .open_window(
                WindowOptions {
                    ..Default::default()
                },
                |_, cx| {
                    let text_editor =
                        cx.new(|cx| TextEditor::new(cx.focus_handle(), content.into()));
                    cx.new(|cx| Main::new(text_editor, cx))
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
