import "./App.css";
import { useEffect } from "react";
import Editor from "./components/Editor";
import Navigation from "./components/Navigation";
import {
	ActiveNoteProvider,
	useActiveNote,
} from "./contexts/ActiveNoteContext";
import { useNoteStore } from "./stores/notes";

function AppContent() {
	const { activeNoteId } = useActiveNote();
	const { initializeStore } = useNoteStore();

	useEffect(() => {
		initializeStore();
	}, [initializeStore]);

	return (
		<main className="h-screen flex flex-col">
			<Navigation />

			<div className="px-4 py-1 flex-1">
				<Editor noteId={activeNoteId} />
			</div>
		</main>
	);
}

function App() {
	return (
		<ActiveNoteProvider initialNoteId="fd9bc5fa-dc0d-46e3-afd1-abe176b2c96f">
			<AppContent />
		</ActiveNoteProvider>
	);
}

export default App;
