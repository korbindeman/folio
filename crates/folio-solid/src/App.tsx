import { NotesProvider } from "./api";
import { Breadcrumbs } from "./components/Breadcrumbs";
import EditorManager from "./components/EditorManager";

function App() {
  return (
    <NotesProvider>
      <div class="h-screen flex flex-col p-4 pt-0">
        <Breadcrumbs />
        <EditorManager />
      </div>
    </NotesProvider>
  );
}

export default App;
