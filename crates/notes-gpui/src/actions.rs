use gpui::actions;

actions!(
    text_input,
    [
        Backspace,
        Delete,
        Left,
        Right,
        Up,
        Down,
        SelectLeft,
        SelectRight,
        SelectAll,
        Home,
        End,
        ShowCharacterPalette,
        Paste,
        Cut,
        Copy,
        Enter,
        Quit,
    ]
);

// Event emitted when the text editor content changes
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContentChanged;
