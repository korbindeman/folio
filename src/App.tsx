import "./App.css";
import Editor from "./components/Editor";

function App() {
	return (
		<main className="h-screen overflow-hidden">
			<div className="px-4 py-2">
				<Editor />
			</div>
		</main>
	);
}

export default App;
