# Folio

A note-taking app designed to be bloat-free, robust, and "overzichtelijk"; a Dutch word meaning clear, organized, and easy to navigate.

Most note-taking apps separate folders from notes. This app treats them as the same thing. Each node in the tree can contain both content and child notes. This natural hierarchy reduces duplicate and forgotten notes.

What I'm describing above is my main issue with my current note-taking workflow. I've tried lots of note-taking apps but haven't found anything I really liked.

---

## Planned features

- Genuinely helpful AI integration.
- A good Vim mode.
- Private, encrypted notes
- A mobile app

---

## Current state

The core functionality works; you can create, edit, and organize notes in a tree structure.

Some important things like backlinks, full-text search, starred notes, settings, context-menus and much more are also not yet implemented.

There is a basic markdown editor (using [Milkdown](https://milkdown.dev/)), but it doesn't work very well. I am planning on creating a custom markdown editor that would suit the needs of this app specifically.

Windows/Linux support is limited and untested.

---

## Developing

To develop locally, run: (make sure the npm packages in the frontend crate have been installed)
```bash
make dev
```

To build the app, run:
```bash
make build
```

---

## A note on AI usage

I'm using AI coding tools ([Claude Code](https://www.claude.com/product/claude-code), [Amp](https://ampcode.com/) and [Zed](https://zed.dev/agentic)) for development. I carefully review all generated code and write significant portions myself, and I do my best to maintain the quality of the codebase.
