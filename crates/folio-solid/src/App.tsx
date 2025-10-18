import { NotesProvider } from "./api";
import { Navigation } from "./components/Navigation";
import EditorManager from "./components/EditorManager";

function App() {
  return (
    <NotesProvider>
      <div class="h-screen flex flex-col pt-0">
        <Navigation />
        <div class="mt-8 flex flex-1">
          <EditorManager />
        </div>
      </div>
    </NotesProvider>
  );
}

export default App;
