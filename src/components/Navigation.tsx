import { useActiveNote } from "../contexts/ActiveNoteContext";
import { useNoteHierarchy } from "../hooks/useNotes";
import type { Note } from "../types/notes";

function Breadcrumb({
	note,
	text,
	last,
	active,
}: {
	note?: Note;
	text: string;
	last?: boolean;
	active?: boolean;
}) {
	const { navigateToNote } = useActiveNote();

	const handleClick = () => {
		if (note && !last) {
			navigateToNote(note.id);
		}
	};

	return (
		<div className="rounded">
			<button
				type="button"
				className="cursor-pointer rounded px-1 py-0.5 transition hover:bg-[#00000009]"
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
	);
}

function Navigation() {
	const { activeNoteId, getCurrentNote } = useActiveNote();
	const { getNotePath } = useNoteHierarchy();

	const path = activeNoteId ? getNotePath(activeNoteId) : [];
	const currentNote = getCurrentNote();

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
					{path.map((note) => (
						<Breadcrumb
							key={note.id}
							note={note}
							text={note.title}
							active={note.id === activeNoteId}
						/>
					))}
					<Breadcrumb text="new" last />
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
