import "./App.css";
import { useEffect, useState } from "react";
import EditorManager from "./components/EditorManager";
import Navigation from "./components/Navigation";
import { ActiveNoteProvider } from "./contexts/ActiveNoteContext";
import { getLastOpenedNote } from "./lib/settings";
import { useNoteStore } from "./stores/notes";

function AppContent() {
	const { initializeStore } = useNoteStore();

	useEffect(() => {
		initializeStore();
	}, [initializeStore]);

	return (
		<div className="h-screen flex flex-col overflow-hidden">
			<Navigation />

			<main className="overflow-auto grow">
				<EditorManager />
			</main>
		</div>
	);
}

function App() {
	const [initialNoteId, setInitialNoteId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function loadInitialNote() {
			try {
				const lastOpenedNote = await getLastOpenedNote();
				setInitialNoteId(lastOpenedNote);
			} catch (error) {
				console.warn("Failed to load last opened note:", error);
			} finally {
				setIsLoading(false);
			}
		}
		loadInitialNote();
	}, []);

	if (isLoading) {
		return (
			<div className="h-screen flex items-center justify-center">
				Loading...
			</div>
		);
	}

	return (
		<ActiveNoteProvider initialNoteId={initialNoteId}>
			<AppContent />
		</ActiveNoteProvider>
	);
}

export default App;
