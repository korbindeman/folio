import { NotesProvider } from "./api";
import { Navigation } from "./components/Navigation";
import EditorManager from "./components/EditorManager";

function App() {
  const isDev = import.meta.env.DEV;

  return (
    <NotesProvider>
      <div class="h-screen flex flex-col pt-0">
        <Navigation />
        <div class="mt-8 flex flex-1">
          <EditorManager />
        </div>
        {isDev && (
          <div class="fixed bottom-2 left-2 opacity-30 text-xs font-bold z-50">
            DEV
          </div>
        )}
      </div>
    </NotesProvider>
  );
}

export default App;
