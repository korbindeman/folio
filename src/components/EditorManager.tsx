import { useActiveNote } from "../contexts/ActiveNoteContext";
import Editor from "./Editor";

const EditorManager = () => {
        const { activeNoteId } = useActiveNote();

        if (!activeNoteId) {
                return (
                        <div className="flex h-screen items-center justify-center">
                                <div className="text-gray-500">No note selected</div>
                        </div>
                );
        }

        return <Editor noteId={activeNoteId} isActive />;
};

export default EditorManager;
