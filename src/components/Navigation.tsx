import { useEffect, useRef, useState } from "react";
import { useActiveNote } from "../contexts/ActiveNoteContext";
import { useNoteHierarchy } from "../hooks/useNotes";
import type { Note } from "../types/notes";

function Dropdown({
	notes,
	onSelect,
	onClose,
}: {
	notes: Note[];
	onSelect: (note: Note) => void;
	onClose: () => void;
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
			{notes.length === 0 ? (
				<div className="px-3 py-2 text-sm text-gray-500">No notes found</div>
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
	last,
	active,
	index,
	onDropdownToggle,
	isDropdownOpen,
	dropdownNotes,
}: {
	note?: Note;
	text: string;
	last?: boolean;
	active?: boolean;
	index: number;
	onDropdownToggle: (index: number) => void;
	isDropdownOpen: boolean;
	dropdownNotes: Note[];
}) {
	const { navigateToNote } = useActiveNote();

	const handleClick = () => {
		if (note && !last) {
			navigateToNote(note.id);
		}
	};

	const handleArrowClick = () => {
		if (!last) {
			onDropdownToggle(index);
		}
	};

	return (
		<div className="relative">
			<div className="rounded">
				<button
					type="button"
					className="cursor-pointer rounded px-1 py-0.5 transition hover:bg-[#00000009]"
					onClick={handleArrowClick}
					disabled={last}
				>
					&gt;
				</button>
				<button
					type="button"
					className={`rounded px-1 py-0.5 transition cursor-pointer hover:bg-[#00000009] ${last && "opacity-50"} ${
						active && "font-bold"
					}`}
					onClick={handleClick}
					disabled={last || !note}
				>
					{text}
				</button>
			</div>
			{isDropdownOpen && (
				<Dropdown
					notes={dropdownNotes}
					onSelect={(selectedNote) => {
						navigateToNote(selectedNote.id);
						onDropdownToggle(-1); // Close dropdown
					}}
					onClose={() => onDropdownToggle(-1)}
				/>
			)}
		</div>
	);
}

function Navigation() {
	const { activeNoteId, getCurrentNote } = useActiveNote();
	const { getNotePath, notes } = useNoteHierarchy();
	const [openDropdownIndex, setOpenDropdownIndex] = useState<number>(-1);

	const path = activeNoteId ? getNotePath(activeNoteId) : [];
	const currentNote = getCurrentNote();

	console.log(path);

	const handleDropdownToggle = (index: number) => {
		setOpenDropdownIndex(openDropdownIndex === index ? -1 : index);
	};

	const getSiblingNotes = (index: number): Note[] => {
		if (index >= path.length) return [];

		// Get the parent of the note at this index
		const parentId = index === 0 ? null : path[index - 1].id;

		// Return all notes with the same parent
		return Array.from(notes.values()).filter(
			(note) => note.parentId === parentId,
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
					{path.map((note, index) => (
						<Breadcrumb
							key={note.id}
							note={note}
							text={note.title}
							active={note.id === activeNoteId}
							index={index}
							onDropdownToggle={handleDropdownToggle}
							isDropdownOpen={openDropdownIndex === index}
							dropdownNotes={getSiblingNotes(index)}
						/>
					))}
					<Breadcrumb
						text="new"
						last
						index={path.length}
						onDropdownToggle={handleDropdownToggle}
						isDropdownOpen={false}
						dropdownNotes={[]}
					/>
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
