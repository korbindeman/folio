import { useEffect } from "react";
import { useNoteHierarchy, useNotes } from "../hooks/useNotes";

function Breadcrumb({ text, last }: { text: string; last?: boolean }) {
	return (
		<div className="rounded hover:bg-[#00000009]">
			<button
				type="button"
				className="cursor-pointer rounded px-1 py-0.5 transition"
			>
				&gt;
			</button>
			<a
				href="/"
				className={`rounded px-1 py-0.5 transition ${last && "opacity-50"}`}
			>
				{text}
			</a>
		</div>
	);
}

function Navigation({ noteId }: { noteId: string }) {
	const { getNotePath } = useNoteHierarchy();
	const path = getNotePath(noteId);

	return (
		<nav className="px-2 pb-0.5">
			<div className="flex items-center font-mono text-sm tracking-tight">
				{path.map((note) => (
					<Breadcrumb key={note.id} text={note.title} />
				))}
				<Breadcrumb text="New" last />
			</div>
		</nav>
	);
}

export default Navigation;
