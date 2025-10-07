use std::ops::Range;

use gpui::{
    App, Bounds, ClipboardItem, Context, CursorStyle, ElementId, ElementInputHandler, Entity,
    EntityInputHandler, EventEmitter, FocusHandle, Focusable, GlobalElementId, LayoutId,
    MouseButton, MouseDownEvent, MouseMoveEvent, MouseUpEvent, PaintQuad, Pixels, Point,
    ShapedLine, SharedString, Style, TextRun, UTF16Selection, Window, div, fill, point, prelude::*,
    px, relative, rgb, rgba, size, white,
};
use unicode_segmentation::*;

use crate::actions::{
    Backspace, ContentChanged, Copy, Cut, Delete, Down, End, Enter, Home, Left, Paste, Right,
    SelectAll, SelectLeft, SelectRight, ShowCharacterPalette, Up,
};

pub struct TextEditor {
    focus_handle: FocusHandle,
    content: SharedString,
    selected_range: Range<usize>,
    selection_reversed: bool,
    marked_range: Option<Range<usize>>,
    last_layout: Vec<ShapedLine>,
    last_bounds: Option<Bounds<Pixels>>,
    is_selecting: bool,
}

impl TextEditor {
    pub fn new(focus_handle: FocusHandle, content: SharedString) -> Self {
        Self {
            focus_handle,
            content,
            selected_range: 0..0,
            selection_reversed: false,
            marked_range: None,
            last_layout: Vec::new(),
            last_bounds: None,
            is_selecting: false,
        }
    }

    pub fn content(&self) -> &str {
        &self.content
    }

    fn left(&mut self, _: &Left, _: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.move_to(self.previous_boundary(self.cursor_offset()), cx);
        } else {
            self.move_to(self.selected_range.start, cx)
        }
    }

    fn right(&mut self, _: &Right, _: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.move_to(self.next_boundary(self.selected_range.end), cx);
        } else {
            self.move_to(self.selected_range.end, cx)
        }
    }

    fn select_left(&mut self, _: &SelectLeft, _: &mut Window, cx: &mut Context<Self>) {
        self.select_to(self.previous_boundary(self.cursor_offset()), cx);
    }

    fn select_right(&mut self, _: &SelectRight, _: &mut Window, cx: &mut Context<Self>) {
        self.select_to(self.next_boundary(self.cursor_offset()), cx);
    }

    fn select_all(&mut self, _: &SelectAll, _: &mut Window, cx: &mut Context<Self>) {
        self.move_to(0, cx);
        self.select_to(self.content.len(), cx)
    }

    fn home(&mut self, _: &Home, _: &mut Window, cx: &mut Context<Self>) {
        let cursor = self.cursor_offset();
        let (line_idx, _) = self.absolute_to_line_offset(cursor);
        let new_pos = self.line_offset_to_absolute(line_idx, 0);
        self.move_to(new_pos, cx);
    }

    fn end(&mut self, _: &End, _: &mut Window, cx: &mut Context<Self>) {
        let cursor = self.cursor_offset();
        let (line_idx, _) = self.absolute_to_line_offset(cursor);
        let lines = self.get_lines();
        let line_len = lines.get(line_idx).map_or(0, |l| l.len());
        let new_pos = self.line_offset_to_absolute(line_idx, line_len);
        self.move_to(new_pos, cx);
    }

    fn enter(&mut self, _: &Enter, window: &mut Window, cx: &mut Context<Self>) {
        self.replace_text_in_range(None, "\n", window, cx);
    }

    fn up(&mut self, _: &Up, _: &mut Window, cx: &mut Context<Self>) {
        let cursor = self.cursor_offset();
        let (line_idx, offset) = self.absolute_to_line_offset(cursor);
        if line_idx > 0 {
            let new_pos = self.line_offset_to_absolute(line_idx - 1, offset);
            self.move_to(new_pos, cx);
        }
    }

    fn down(&mut self, _: &Down, _: &mut Window, cx: &mut Context<Self>) {
        let cursor = self.cursor_offset();
        let (line_idx, offset) = self.absolute_to_line_offset(cursor);
        let lines = self.get_lines();
        if line_idx < lines.len() - 1 {
            let new_pos = self.line_offset_to_absolute(line_idx + 1, offset);
            self.move_to(new_pos, cx);
        }
    }

    fn backspace(&mut self, _: &Backspace, window: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.select_to(self.previous_boundary(self.cursor_offset()), cx)
        }
        self.replace_text_in_range(None, "", window, cx)
    }

    fn delete(&mut self, _: &Delete, window: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.select_to(self.next_boundary(self.cursor_offset()), cx)
        }
        self.replace_text_in_range(None, "", window, cx)
    }

    fn on_mouse_down(
        &mut self,
        event: &MouseDownEvent,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        self.is_selecting = true;

        if event.modifiers.shift {
            self.select_to(self.index_for_mouse_position(event.position), cx);
        } else {
            self.move_to(self.index_for_mouse_position(event.position), cx)
        }
    }

    fn on_mouse_up(&mut self, _: &MouseUpEvent, _window: &mut Window, _: &mut Context<Self>) {
        self.is_selecting = false;
    }

    fn on_mouse_move(&mut self, event: &MouseMoveEvent, _: &mut Window, cx: &mut Context<Self>) {
        if self.is_selecting {
            self.select_to(self.index_for_mouse_position(event.position), cx);
        }
    }

    fn show_character_palette(
        &mut self,
        _: &ShowCharacterPalette,
        window: &mut Window,
        _: &mut Context<Self>,
    ) {
        window.show_character_palette();
    }

    fn paste(&mut self, _: &Paste, window: &mut Window, cx: &mut Context<Self>) {
        if let Some(text) = cx.read_from_clipboard().and_then(|item| item.text()) {
            self.replace_text_in_range(None, &text, window, cx);
        }
    }

    fn copy(&mut self, _: &Copy, _: &mut Window, cx: &mut Context<Self>) {
        if !self.selected_range.is_empty() {
            cx.write_to_clipboard(ClipboardItem::new_string(
                self.content[self.selected_range.clone()].to_string(),
            ));
        }
    }
    fn cut(&mut self, _: &Cut, window: &mut Window, cx: &mut Context<Self>) {
        if !self.selected_range.is_empty() {
            cx.write_to_clipboard(ClipboardItem::new_string(
                self.content[self.selected_range.clone()].to_string(),
            ));
            self.replace_text_in_range(None, "", window, cx)
        }
    }

    fn move_to(&mut self, offset: usize, cx: &mut Context<Self>) {
        self.selected_range = offset..offset;
        cx.notify()
    }

    fn cursor_offset(&self) -> usize {
        if self.selection_reversed {
            self.selected_range.start
        } else {
            self.selected_range.end
        }
    }

    fn get_lines(&self) -> Vec<&str> {
        self.content.split('\n').collect()
    }

    fn line_offset_to_absolute(&self, line_idx: usize, offset: usize) -> usize {
        let lines = self.get_lines();
        let mut absolute = 0;
        for (i, line) in lines.iter().enumerate() {
            if i == line_idx {
                return absolute + offset.min(line.len());
            }
            absolute += line.len() + 1; // +1 for newline
        }
        self.content.len()
    }

    fn absolute_to_line_offset(&self, absolute: usize) -> (usize, usize) {
        let lines = self.get_lines();
        let mut current = 0;
        for (i, line) in lines.iter().enumerate() {
            let line_end = current + line.len();
            if absolute <= line_end {
                return (i, absolute - current);
            }
            current = line_end + 1; // +1 for newline
        }
        (
            lines.len().saturating_sub(1),
            lines.last().map_or(0, |l| l.len()),
        )
    }

    fn index_for_mouse_position(&self, position: Point<Pixels>) -> usize {
        if self.content.is_empty() {
            return 0;
        }

        let Some(bounds) = self.last_bounds.as_ref() else {
            return 0;
        };

        if self.last_layout.is_empty() {
            return 0;
        }

        if position.y < bounds.top() {
            return 0;
        }
        if position.y > bounds.bottom() {
            return self.content.len();
        }

        let line_height = bounds.size.height / self.last_layout.len() as f32;
        let line_idx = ((position.y - bounds.top()) / line_height).floor() as usize;
        let line_idx = line_idx.min(self.last_layout.len() - 1);

        let line = &self.last_layout[line_idx];
        let x_offset = line.closest_index_for_x(position.x - bounds.left());
        self.line_offset_to_absolute(line_idx, x_offset)
    }

    fn select_to(&mut self, offset: usize, cx: &mut Context<Self>) {
        if self.selection_reversed {
            self.selected_range.start = offset
        } else {
            self.selected_range.end = offset
        };
        if self.selected_range.end < self.selected_range.start {
            self.selection_reversed = !self.selection_reversed;
            self.selected_range = self.selected_range.end..self.selected_range.start;
        }
        cx.notify()
    }

    fn offset_from_utf16(&self, offset: usize) -> usize {
        let mut utf8_offset = 0;
        let mut utf16_count = 0;

        for ch in self.content.chars() {
            if utf16_count >= offset {
                break;
            }
            utf16_count += ch.len_utf16();
            utf8_offset += ch.len_utf8();
        }

        utf8_offset
    }

    fn offset_to_utf16(&self, offset: usize) -> usize {
        let mut utf16_offset = 0;
        let mut utf8_count = 0;

        for ch in self.content.chars() {
            if utf8_count >= offset {
                break;
            }
            utf8_count += ch.len_utf8();
            utf16_offset += ch.len_utf16();
        }

        utf16_offset
    }

    fn range_to_utf16(&self, range: &Range<usize>) -> Range<usize> {
        self.offset_to_utf16(range.start)..self.offset_to_utf16(range.end)
    }

    fn range_from_utf16(&self, range_utf16: &Range<usize>) -> Range<usize> {
        self.offset_from_utf16(range_utf16.start)..self.offset_from_utf16(range_utf16.end)
    }

    fn previous_boundary(&self, offset: usize) -> usize {
        self.content
            .grapheme_indices(true)
            .rev()
            .find_map(|(idx, _)| (idx < offset).then_some(idx))
            .unwrap_or(0)
    }

    fn next_boundary(&self, offset: usize) -> usize {
        self.content
            .grapheme_indices(true)
            .find_map(|(idx, _)| (idx > offset).then_some(idx))
            .unwrap_or(self.content.len())
    }
}

impl EntityInputHandler for TextEditor {
    fn text_for_range(
        &mut self,
        range_utf16: Range<usize>,
        actual_range: &mut Option<Range<usize>>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<String> {
        let range = self.range_from_utf16(&range_utf16);
        actual_range.replace(self.range_to_utf16(&range));
        Some(self.content[range].to_string())
    }

    fn selected_text_range(
        &mut self,
        _ignore_disabled_input: bool,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<UTF16Selection> {
        Some(UTF16Selection {
            range: self.range_to_utf16(&self.selected_range),
            reversed: self.selection_reversed,
        })
    }

    fn marked_text_range(
        &self,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<Range<usize>> {
        self.marked_range
            .as_ref()
            .map(|range| self.range_to_utf16(range))
    }

    fn unmark_text(&mut self, _window: &mut Window, _cx: &mut Context<Self>) {
        self.marked_range = None;
    }

    fn replace_text_in_range(
        &mut self,
        range_utf16: Option<Range<usize>>,
        new_text: &str,
        _: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let range = range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .or(self.marked_range.clone())
            .unwrap_or(self.selected_range.clone());

        self.content =
            (self.content[0..range.start].to_owned() + new_text + &self.content[range.end..])
                .into();
        self.selected_range = range.start + new_text.len()..range.start + new_text.len();
        self.marked_range.take();
        cx.emit(ContentChanged);
        cx.notify();
    }

    fn replace_and_mark_text_in_range(
        &mut self,
        range_utf16: Option<Range<usize>>,
        new_text: &str,
        new_selected_range_utf16: Option<Range<usize>>,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let range = range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .or(self.marked_range.clone())
            .unwrap_or(self.selected_range.clone());

        self.content =
            (self.content[0..range.start].to_owned() + new_text + &self.content[range.end..])
                .into();
        if !new_text.is_empty() {
            self.marked_range = Some(range.start..range.start + new_text.len());
        } else {
            self.marked_range = None;
        }
        self.selected_range = new_selected_range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .map(|new_range| new_range.start + range.start..new_range.end + range.end)
            .unwrap_or_else(|| range.start + new_text.len()..range.start + new_text.len());

        cx.notify();
    }

    fn bounds_for_range(
        &mut self,
        range_utf16: Range<usize>,
        bounds: Bounds<Pixels>,
        window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<Bounds<Pixels>> {
        if self.last_layout.is_empty() {
            return None;
        }

        let range = self.range_from_utf16(&range_utf16);
        let (start_line, start_offset) = self.absolute_to_line_offset(range.start);
        let (end_line, end_offset) = self.absolute_to_line_offset(range.end);

        let line_height = window.line_height();

        if start_line == end_line {
            // Single line range
            let line = self.last_layout.get(start_line)?;
            let start_x = line.x_for_index(start_offset);
            let end_x = line.x_for_index(end_offset);
            let y = bounds.top() + line_height * start_line as f32;

            Some(Bounds::from_corners(
                point(bounds.left() + start_x, y),
                point(bounds.left() + end_x, y + line_height),
            ))
        } else {
            // Multi-line range - return bounding box
            let start_line_obj = self.last_layout.get(start_line)?;
            let end_line_obj = self.last_layout.get(end_line)?;

            let start_x = start_line_obj.x_for_index(start_offset);
            let end_x = end_line_obj.x_for_index(end_offset);
            let start_y = bounds.top() + line_height * start_line as f32;
            let end_y = bounds.top() + line_height * (end_line + 1) as f32;

            Some(Bounds::from_corners(
                point(bounds.left() + start_x, start_y),
                point(bounds.left() + end_x, end_y),
            ))
        }
    }

    fn character_index_for_point(
        &mut self,
        point: gpui::Point<Pixels>,
        window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<usize> {
        let bounds = self.last_bounds?;

        if self.last_layout.is_empty() {
            return None;
        }

        let line_height = window.line_height();
        let line_idx = ((point.y - bounds.top()) / line_height).floor() as usize;
        let line_idx = line_idx.min(self.last_layout.len() - 1);

        let line = self.last_layout.get(line_idx)?;
        let x_offset = line.index_for_x(point.x - bounds.left())?;
        let absolute_offset = self.line_offset_to_absolute(line_idx, x_offset);

        Some(self.offset_to_utf16(absolute_offset))
    }
}

struct TextElement {
    input: Entity<TextEditor>,
}

struct PrepaintState {
    lines: Vec<ShapedLine>,
    cursor: Option<PaintQuad>,
    selection: Vec<PaintQuad>,
}

impl IntoElement for TextElement {
    type Element = Self;

    fn into_element(self) -> Self::Element {
        self
    }
}

impl Element for TextElement {
    type RequestLayoutState = ();
    type PrepaintState = PrepaintState;

    fn id(&self) -> Option<ElementId> {
        None
    }

    fn source_location(&self) -> Option<&'static core::panic::Location<'static>> {
        None
    }

    fn request_layout(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        window: &mut Window,
        cx: &mut App,
    ) -> (LayoutId, Self::RequestLayoutState) {
        let input = self.input.read(cx);
        let line_count = input.content.split('\n').count().max(1);

        let mut style = Style::default();
        style.size.width = relative(1.).into();
        style.size.height = (window.line_height() * line_count as f32).into();
        (window.request_layout(style, [], cx), ())
    }

    fn prepaint(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        bounds: Bounds<Pixels>,
        _request_layout: &mut Self::RequestLayoutState,
        window: &mut Window,
        cx: &mut App,
    ) -> Self::PrepaintState {
        let input = self.input.read(cx);
        let content = input.content.clone();
        let selected_range = input.selected_range.clone();
        let cursor = input.cursor_offset();
        let style = window.text_style();
        let line_height = window.line_height();

        let (display_text, text_color) = (content.clone(), style.color);

        let font_size = style.font_size.to_pixels(window.rem_size());

        // Split content into lines and shape each one
        let text_lines: Vec<String> = display_text.split('\n').map(|s| s.to_string()).collect();
        let mut shaped_lines = Vec::new();

        for line_text in text_lines.iter() {
            let run = TextRun {
                len: line_text.len(),
                font: style.font(),
                color: text_color,
                background_color: None,
                underline: None,
                strikethrough: None,
            };

            let shaped =
                window
                    .text_system()
                    .shape_line(line_text.clone().into(), font_size, &[run], None);
            shaped_lines.push(shaped);
        }

        // Calculate cursor position
        let (cursor_line, cursor_offset) = input.absolute_to_line_offset(cursor);
        let cursor_x = shaped_lines
            .get(cursor_line)
            .map(|line| line.x_for_index(cursor_offset))
            .unwrap_or(px(0.));
        let cursor_y = bounds.top() + line_height * cursor_line as f32;

        let cursor_quad = if selected_range.is_empty() {
            Some(fill(
                Bounds::new(
                    point(bounds.left() + cursor_x, cursor_y),
                    size(px(2.), line_height),
                ),
                gpui::blue(),
            ))
        } else {
            None
        };

        // Calculate selection quads
        let mut selection_quads = Vec::new();
        if !selected_range.is_empty() {
            let (start_line, start_offset) = input.absolute_to_line_offset(selected_range.start);
            let (end_line, end_offset) = input.absolute_to_line_offset(selected_range.end);

            if start_line == end_line {
                // Single line selection
                if let Some(line) = shaped_lines.get(start_line) {
                    let start_x = line.x_for_index(start_offset);
                    let end_x = line.x_for_index(end_offset);
                    let y = bounds.top() + line_height * start_line as f32;
                    selection_quads.push(fill(
                        Bounds::from_corners(
                            point(bounds.left() + start_x, y),
                            point(bounds.left() + end_x, y + line_height),
                        ),
                        rgba(0x3311ff30),
                    ));
                }
            } else {
                // Multi-line selection
                for line_idx in start_line..=end_line {
                    if let Some(line) = shaped_lines.get(line_idx) {
                        let y = bounds.top() + line_height * line_idx as f32;
                        let (start_x, end_x) = if line_idx == start_line {
                            (
                                line.x_for_index(start_offset),
                                line.x_for_index(line.text.len()),
                            )
                        } else if line_idx == end_line {
                            (px(0.), line.x_for_index(end_offset))
                        } else {
                            (px(0.), line.x_for_index(line.text.len()))
                        };
                        selection_quads.push(fill(
                            Bounds::from_corners(
                                point(bounds.left() + start_x, y),
                                point(bounds.left() + end_x, y + line_height),
                            ),
                            rgba(0x3311ff30),
                        ));
                    }
                }
            }
        }

        PrepaintState {
            lines: shaped_lines,
            cursor: cursor_quad,
            selection: selection_quads,
        }
    }

    fn paint(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        bounds: Bounds<Pixels>,
        _request_layout: &mut Self::RequestLayoutState,
        prepaint: &mut Self::PrepaintState,
        window: &mut Window,
        cx: &mut App,
    ) {
        let focus_handle = self.input.read(cx).focus_handle.clone();
        window.handle_input(
            &focus_handle,
            ElementInputHandler::new(bounds, self.input.clone()),
            cx,
        );

        // Paint selections
        for selection_quad in prepaint.selection.iter() {
            window.paint_quad(selection_quad.clone());
        }

        // Paint all lines
        let line_height = window.line_height();
        for (i, line) in prepaint.lines.iter().enumerate() {
            let line_origin = point(bounds.left(), bounds.top() + line_height * i as f32);
            line.paint(line_origin, line_height, window, cx).unwrap();
        }

        // Paint cursor
        if focus_handle.is_focused(window) {
            if let Some(cursor) = &prepaint.cursor {
                window.paint_quad(cursor.clone());
            }
        }

        // Store layout for input handling
        let lines = std::mem::take(&mut prepaint.lines);
        self.input.update(cx, |input, _cx| {
            input.last_layout = lines;
            input.last_bounds = Some(bounds);
        });
    }
}

impl Render for TextEditor {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let font_size = 14.;
        div()
            .flex()
            .key_context("TextInput")
            .track_focus(&self.focus_handle(cx))
            .cursor(CursorStyle::IBeam)
            .on_action(cx.listener(Self::backspace))
            .on_action(cx.listener(Self::delete))
            .on_action(cx.listener(Self::left))
            .on_action(cx.listener(Self::right))
            .on_action(cx.listener(Self::up))
            .on_action(cx.listener(Self::down))
            .on_action(cx.listener(Self::select_left))
            .on_action(cx.listener(Self::select_right))
            .on_action(cx.listener(Self::select_all))
            .on_action(cx.listener(Self::home))
            .on_action(cx.listener(Self::end))
            .on_action(cx.listener(Self::enter))
            .on_action(cx.listener(Self::show_character_palette))
            .on_action(cx.listener(Self::paste))
            .on_action(cx.listener(Self::cut))
            .on_action(cx.listener(Self::copy))
            .on_mouse_down(MouseButton::Left, cx.listener(Self::on_mouse_down))
            .on_mouse_up(MouseButton::Left, cx.listener(Self::on_mouse_up))
            .on_mouse_up_out(MouseButton::Left, cx.listener(Self::on_mouse_up))
            .on_mouse_move(cx.listener(Self::on_mouse_move))
            .bg(rgb(0xeeeeee))
            .line_height(px(font_size * 1.5))
            .text_size(px(font_size))
            .child(
                div()
                    .h_full()
                    .w_full()
                    .p(px(4.))
                    .bg(white())
                    .child(TextElement { input: cx.entity() }),
            )
    }
}

impl Focusable for TextEditor {
    fn focus_handle(&self, _: &App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

impl EventEmitter<ContentChanged> for TextEditor {}
