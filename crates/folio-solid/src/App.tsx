import { NotesProvider } from "./api";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { Editor } from "./components/Editor";

function App() {
  return (
    <NotesProvider>
      <div class="h-screen flex flex-col p-4">
        <Breadcrumbs />
        <Editor />
      </div>
    </NotesProvider>
  );
}

export default App;
