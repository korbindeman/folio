import "./App.css";
import Editor from "./components/Editor";
import Navigation from "./components/Navigation";

function App() {
	const noteId = "80cf13bd-068f-4429-b1d8-09684e3662c3";

	return (
		<main className="h-screen overflow-hidden">
			<Navigation noteId={noteId} />

			<div className="px-4 py-1">
				<Editor noteId={noteId} />
			</div>
		</main>
	);
}

export default App;
