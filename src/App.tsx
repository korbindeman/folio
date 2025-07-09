import "./App.css";
import Editor from "./components/Editor";
import Navigation from "./components/Navigation";
import NavigationControls from "./components/NavigationControls";
import {
	ActiveNoteProvider,
	useActiveNote,
} from "./contexts/ActiveNoteContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function AppContent() {
	const { activeNoteId } = useActiveNote();
	useKeyboardShortcuts();

	return (
		<main className="h-screen flex flex-col">
			<Navigation />

			<div className="px-4 py-1 flex-1">
				<Editor noteId={activeNoteId} />
			</div>

			<NavigationControls />
		</main>
	);
}

function App() {
	return (
		<ActiveNoteProvider initialNoteId="80cf13bd-068f-4429-b1d8-09684e3662c3">
			<AppContent />
		</ActiveNoteProvider>
	);
}

export default App;
