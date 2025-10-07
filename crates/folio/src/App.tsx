import Breadcrumbs from "./components/Breadcrumb";
import { NotesProvider } from "./context/notes";
import { NoteEditor } from "./components/Editor";

function App() {
  return (
    <NotesProvider initialNotePath={"hello"}>
      <div className="h-screen flex flex-col p-4 pt-0">
        <Breadcrumbs />
        <NoteEditor />
      </div>
    </NotesProvider>
  );
}

export default App;
