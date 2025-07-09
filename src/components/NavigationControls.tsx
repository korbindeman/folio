import { useActiveNote } from "../contexts/ActiveNoteContext";
import { useNoteHierarchy } from "../hooks/useNotes";

function NavigationControls() {
	const {
		activeNoteId,
		navigateToNote,
		navigateBack,
		navigateForward,
		canNavigateBack,
		canNavigateForward,
		navigationHistory,
		getCurrentNote,
	} = useActiveNote();

	const { getRootNotes } = useNoteHierarchy();
	const rootNotes = getRootNotes();
	const currentNote = getCurrentNote();

	return (
		<div className="border-t border-gray-200 p-4 bg-gray-50">
			<div className="space-y-3">
				{/* Current State Info */}
				<div className="text-sm">
					<div className="font-medium text-gray-700">Navigation State:</div>
					<div className="text-gray-600">
						Active Note: {activeNoteId || "None"}
					</div>
					{currentNote && (
						<div className="text-gray-600">
							Current Title: {currentNote.title}
						</div>
					)}
					<div className="text-gray-600">
						History: [{navigationHistory.join(", ")}]
					</div>
				</div>

				{/* Navigation Controls */}
				<div className="flex items-center space-x-2">
					<button
						type="button"
						onClick={navigateBack}
						disabled={!canNavigateBack}
						className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
					>
						← Back
					</button>
					<button
						type="button"
						onClick={navigateForward}
						disabled={!canNavigateForward}
						className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
					>
						Forward →
					</button>
				</div>

				{/* Quick Navigation */}
				<div>
					<div className="text-sm font-medium text-gray-700 mb-2">
						Quick Navigation:
					</div>
					<div className="flex flex-wrap gap-2">
						{rootNotes.slice(0, 5).map((note) => (
							<button
								key={note.id}
								type="button"
								onClick={() => navigateToNote(note.id)}
								className={`px-2 py-1 text-xs rounded ${
									activeNoteId === note.id
										? "bg-blue-600 text-white"
										: "bg-gray-200 text-gray-700 hover:bg-gray-300"
								}`}
							>
								{note.title}
							</button>
						))}
					</div>
				</div>

				{/* Keyboard Shortcuts Info */}
				<div className="text-xs text-gray-500 border-t pt-2">
					<div className="font-medium mb-1">Keyboard Shortcuts:</div>
					<div>Ctrl/Cmd + ← : Go back</div>
					<div>Ctrl/Cmd + → : Go forward</div>
					<div>Ctrl/Cmd + [ : Go back</div>
					<div>Ctrl/Cmd + ] : Go forward</div>
				</div>
			</div>
		</div>
	);
}

export default NavigationControls;
