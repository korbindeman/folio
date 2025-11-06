import { NotesProvider } from "./api";
import { Navigation } from "./components/Navigation";
import EditorManager from "./components/EditorManager";

function App() {
  const isDev = import.meta.env.DEV;

  return (
    <NotesProvider>
      <div class="flex h-screen flex-col pt-0">
        <Navigation />
        <div class="mt-8 flex flex-1">
          <EditorManager />
        </div>
        {isDev && (
          <div class="fixed bottom-2 left-2 z-50 text-xs font-bold opacity-30">
            DEV
          </div>
        )}
      </div>
    </NotesProvider>
  );
}

export default App;
