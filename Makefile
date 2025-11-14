.PHONY: help install dev build test format clean

# Default target - show available commands
help:
	@echo "Available commands:"
	@echo "  make install  - Install frontend dependencies"
	@echo "  make dev      - Run Tauri app in development mode"
	@echo "  make build    - Build Tauri app for production"
	@echo "  make test     - Run all tests"
	@echo "  make format   - Format all code (Rust + frontend)"
	@echo "  make clean    - Clean build artifacts"

# Install frontend dependencies
install:
	cd crates/frontend && bun install

# Run Tauri app in development mode
dev: install
	cd crates/frontend && bun tauri dev

# Build Tauri app for production
build: install
	cd crates/frontend && bun tauri build

# Run all tests
test:
	cargo test

# Format all code
format:
	cargo fmt
	cd crates/frontend && bun run format

# Clean build artifacts
clean:
	cargo clean
	cd crates/frontend && rm -rf dist node_modules
