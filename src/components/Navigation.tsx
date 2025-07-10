import { useEffect, useRef, useState } from "react";
import { useActiveNote } from "../contexts/ActiveNoteContext";
import { useNoteHierarchy } from "../hooks/useNotes";
import type { Note } from "../types/notes";

function Dropdown({
	notes,
	onSelect,
	onClose,
	onCreateNew,
}: {
	notes: Note[];
	onSelect: (note: Note) => void;
	onClose: () => void;
	onCreateNew: () => void;
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
					<button
						key={note.id}
						type="button"
						className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
						onClick={() => onSelect(note)}
					>
						{note.title}
					</button>
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
}: {
	note?: Note;
	text: string;
	active?: boolean;
	index: number;
	onDropdownToggle: (index: number) => void;
	isDropdownOpen: boolean;
	dropdownNotes: Note[];
	onCreateChild: (parentId: string) => void;
}) {
	const { navigateToNote } = useActiveNote();

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
				<button
					type="button"
					className={`rounded px-1 py-0.5 transition cursor-pointer hover:bg-[#00000009] ${
						active && "font-bold"
					}`}
					onClick={handleClick}
					disabled={!note}
				>
					{text}
				</button>
				<button
					type="button"
					className="cursor-pointer rounded px-1 py-0.5 transition hover:bg-[#00000009]"
					onClick={handleArrowClick}
					disabled={dropdownNotes.length === 0 && (!note || !active)}
				>
					{dropdownNotes.length === 0 && note && active ? "+" : ">"}
				</button>
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
				/>
			)}
		</div>
	);
}

function Navigation() {
	const { activeNoteId, getCurrentNote, navigateToNote } = useActiveNote();
	const { getNotePath, notes, getRootNotes, createNewNote } =
		useNoteHierarchy();
	const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
		null,
	);

	const path = activeNoteId ? getNotePath(activeNoteId) : [];
	const currentNote = getCurrentNote();

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

	const getChildNotes = (index: number): Note[] => {
		if (index === -1) {
			// Root dropdown - show all root notes
			return getRootNotes();
		}

		if (index >= path.length) return [];

		// Show children of the note at this index
		const noteId = path[index].id;
		return Array.from(notes.values()).filter(
			(note) => note.parentId === noteId,
		);
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
									handleCreateChild(null);
									handleDropdownToggle(-2);
								}}
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
							dropdownNotes={getChildNotes(index)}
							onCreateChild={handleCreateChild}
						/>
					))}
				</div>
				{currentNote && (
					<div className="text-sm font-medium text-gray-700 truncate max-w-xs">
						{currentNote.title}
					</div>
				)}
			</div>
		</nav>
	);
}

export default Navigation;
