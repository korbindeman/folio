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
		<ActiveNoteProvider initialNoteId="85abd57e-ca04-4b98-85c5-9252bb2ae741">
			<AppContent />
		</ActiveNoteProvider>
	);
}

export default App;
