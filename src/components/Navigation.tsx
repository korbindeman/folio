import { useEffect, useRef, useState } from "react";
import { useActiveNote } from "../contexts/ActiveNoteContext";
import { useNoteStore } from "../stores/notes";
import type { Note } from "../types/notes";

function Dropdown({
	notes,
	onSelect,
	onClose,
	onCreateNew,
	onArchive,
}: {
	notes: Note[];
	onSelect: (note: Note) => void;
	onClose: () => void;
	onCreateNew: () => void;
	onArchive: (noteId: string) => void;
}) {
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose]);

	return (
		<div
			ref={dropdownRef}
			className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48 max-h-64 overflow-y-auto"
		>
			<button
				type="button"
				className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors border-b border-gray-100 font-medium text-blue-600"
				onClick={onCreateNew}
			>
				+ New note
			</button>
			{notes.length === 0 ? (
				<div className="px-3 py-2 text-sm text-gray-500">No other notes</div>
			) : (
				notes.map((note) => (
					<div
						key={note.id}
						className="flex items-center group hover:bg-gray-100 transition-colors"
					>
						<button
							type="button"
							className="flex-1 text-left px-3 py-2 text-sm"
							onClick={() => onSelect(note)}
						>
							{note.title}
						</button>
						<button
							type="button"
							className="px-2 py-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
							onClick={(e) => {
								e.stopPropagation();
								onArchive(note.id);
							}}
							title="Archive note"
						>
							×
						</button>
					</div>
				))
			)}
		</div>
	);
}

function Breadcrumb({
	note,
	text,
	active,
	index,
	onDropdownToggle,
	isDropdownOpen,
	dropdownNotes,
	onCreateChild,
	onArchive,
	isEditing,
	editingTitle,
	onEditingTitleChange,
	onStartEditing,
	onSaveTitle,
	onTitleKeyDown,
}: {
	note?: Note;
	text: string;
	active?: boolean;
	index: number;
	onDropdownToggle: (index: number) => void;
	isDropdownOpen: boolean;
	dropdownNotes: Note[];
	onCreateChild: (parentId: string) => void;
	onArchive: (noteId: string) => void;
	isEditing: boolean;
	editingTitle: string;
	onEditingTitleChange: (title: string) => void;
	onStartEditing: (noteId: string, title: string) => void;
	onSaveTitle: () => void;
	onCancelEditing: () => void;
	onTitleKeyDown: (e: React.KeyboardEvent) => void;
}) {
	const { navigateToNote } = useActiveNote();
	const buttonRef = useRef<HTMLButtonElement>(null);

	const handleClick = () => {
		if (note) {
			navigateToNote(note.id);
		}
	};

	const handleArrowClick = () => {
		if (dropdownNotes.length > 0) {
			onDropdownToggle(index);
		} else if (note && active) {
			// Create new child for active note with no children
			onCreateChild(note.id);
		}
	};

	return (
		<div className="relative">
			<div className="rounded">
				{isEditing && note ? (
					<input
						type="text"
						value={editingTitle}
						onChange={(e) => onEditingTitleChange(e.target.value)}
						onKeyDown={onTitleKeyDown}
						onBlur={onSaveTitle}
						className={`bg-transparent border-none outline-none font-mono text-sm px-1 py-0.5 rounded transition hover:bg-[#00000009] ${
							active && "font-bold hover:bg-transparent w-fit"
						}`}
						onFocus={(e) => {
							if (editingTitle.toLowerCase() === "untitled") {
								e.target.select();
							}
						}}
						// biome-ignore lint/a11y/noAutofocus: doesn't work without it
						autoFocus
					/>
				) : (
					<button
						ref={buttonRef}
						type="button"
						className={`rounded px-1 py-0.5 transition hover:bg-[#00000009] ${
							active && "font-bold"
						} ${active ? "cursor-text" : "cursor-pointer"}`}
						onClick={
							note && !active
								? handleClick
								: note && active
									? () => onStartEditing(note.id, note.title)
									: undefined
						}
						onDoubleClick={
							note && !active
								? () => onStartEditing(note.id, note.title)
								: undefined
						}
						disabled={!note}
					>
						{text}
					</button>
				)}
				{!isEditing && (
					<button
						type="button"
						className="cursor-pointer rounded px-1 py-0.5 transition hover:bg-[#00000009]"
						onClick={handleArrowClick}
						disabled={dropdownNotes.length === 0 && (!note || !active)}
					>
						{dropdownNotes.length === 0 && note && active ? "+" : ">"}
					</button>
				)}
			</div>
			{isDropdownOpen && (
				<Dropdown
					notes={dropdownNotes}
					onSelect={(selectedNote) => {
						navigateToNote(selectedNote.id);
						onDropdownToggle(-2); // Close dropdown
					}}
					onClose={() => onDropdownToggle(-2)}
					onCreateNew={() => {
						if (note) {
							onCreateChild(note.id);
						}
						onDropdownToggle(-2); // Close dropdown
					}}
					onArchive={onArchive}
				/>
			)}
		</div>
	);
}

function Navigation() {
	const { activeNoteId, navigateToNote } = useActiveNote();
	const {
		getNotePath,
		getRootNotes,
		createNewNote,
		updateNoteTitle,
		getChildNotes,
		archiveNote,
	} = useNoteStore();
	const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
		null,
	);
	const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [editingTitle, setEditingTitle] = useState<string>("");

	const path = activeNoteId ? getNotePath(activeNoteId) : [];

	const handleDropdownToggle = (index: number) => {
		if (index === -2) {
			// Special case for closing dropdown
			setOpenDropdownIndex(null);
		} else {
			setOpenDropdownIndex(openDropdownIndex === index ? null : index);
		}
	};

	const handleRootDropdownToggle = () => {
		setOpenDropdownIndex(openDropdownIndex === -1 ? null : -1);
	};

	const handleCreateChild = async (parentId: string) => {
		const newNoteId = await createNewNote(parentId);
		if (newNoteId) {
			navigateToNote(newNoteId);
		}
	};

	const getChildNotesForDropdown = (index: number): Note[] => {
		if (index === -1) {
			// Root dropdown - show all root notes
			return getRootNotes();
		}

		if (index >= path.length) return [];

		// Show children of the note at this index
		const noteId = path[index].id;
		return getChildNotes(noteId);
	};

	const startEditingTitle = (noteId: string, currentTitle: string) => {
		setEditingNoteId(noteId);
		setEditingTitle(currentTitle);
	};

	const saveTitle = async () => {
		if (!editingNoteId) return;

		const finalTitle = editingTitle.trim() || "untitled";

		try {
			await updateNoteTitle(editingNoteId, finalTitle);
			setEditingNoteId(null);
			setEditingTitle("");
		} catch (err) {
			console.error("Failed to save title:", err);
		}
	};

	const cancelEditing = () => {
		setEditingNoteId(null);
		setEditingTitle("");
	};

	const handleTitleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			saveTitle();
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancelEditing();
		}
	};

	const handleArchive = async (noteId: string) => {
		try {
			await archiveNote(noteId);
			// If the archived note was the active note, we might want to navigate away
			if (noteId === activeNoteId) {
				// Navigate to parent or first available note
				const archivedNote = path.find((n) => n.id === noteId);
				if (archivedNote?.parentId) {
					navigateToNote(archivedNote.parentId);
				} else {
					const rootNotes = getRootNotes();
					if (rootNotes.length > 0) {
						navigateToNote(rootNotes[0].id);
					}
				}
			}
		} catch (err) {
			console.error("Failed to archive note:", err);
		}
	};

	if (!activeNoteId) {
		return (
			<nav className="px-2 pb-0.5">
				<div className="flex items-center justify-between">
					<div className="flex items-center font-mono text-sm tracking-tight text-gray-500">
						No note selected
					</div>
				</div>
			</nav>
		);
	}

	return (
		<nav className="px-2 pb-0.5">
			<div className="flex items-center justify-between">
				<div className="flex items-center font-mono text-sm tracking-tight">
					{/* Root dropdown */}
					<div className="relative">
						<button
							type="button"
							className="cursor-pointer rounded px-1 py-0.5 transition hover:bg-[#00000009]"
							onClick={handleRootDropdownToggle}
						>
							&gt;
						</button>
						{openDropdownIndex === -1 && (
							<Dropdown
								notes={getRootNotes()}
								onSelect={(selectedNote) => {
									navigateToNote(selectedNote.id);
									handleDropdownToggle(-2);
								}}
								onClose={() => handleDropdownToggle(-2)}
								onCreateNew={() => {
									handleCreateChild("");
									handleDropdownToggle(-2);
								}}
								onArchive={handleArchive}
							/>
						)}
					</div>

					{path.map((note, index) => (
						<Breadcrumb
							key={note.id}
							note={note}
							text={note.title}
							active={note.id === activeNoteId}
							index={index}
							onDropdownToggle={handleDropdownToggle}
							isDropdownOpen={openDropdownIndex === index}
							dropdownNotes={getChildNotesForDropdown(index)}
							onCreateChild={handleCreateChild}
							onArchive={handleArchive}
							isEditing={editingNoteId === note.id}
							editingTitle={editingTitle}
							onEditingTitleChange={setEditingTitle}
							onStartEditing={startEditingTitle}
							onSaveTitle={saveTitle}
							onCancelEditing={cancelEditing}
							onTitleKeyDown={handleTitleKeyDown}
						/>
					))}
				</div>
			</div>
		</nav>
	);
}

export default Navigation;
