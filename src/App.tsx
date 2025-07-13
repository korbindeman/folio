import "./App.css";
import { useEffect } from "react";
import EditorManager from "./components/EditorManager";
import Navigation from "./components/Navigation";
import { ActiveNoteProvider } from "./contexts/ActiveNoteContext";
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
	return (
		<ActiveNoteProvider initialNoteId="fd9bc5fa-dc0d-46e3-afd1-abe176b2c96f">
			<AppContent />
		</ActiveNoteProvider>
	);
}

export default App;
