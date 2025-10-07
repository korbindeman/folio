import Breadcrumbs from "./components/Breadcrumb";
import { NotesProvider } from "./context/Notes";
import { NoteEditor } from "./components/Editor";

function App() {
  return (
    <NotesProvider initialNotePath={"hello"}>
      <div className="h-screen flex flex-col">
        <Breadcrumbs />
        <NoteEditor />
      </div>
    </NotesProvider>
  );
}

export default App;
