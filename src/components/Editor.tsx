import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const extensions = [StarterKit];

const content = "<p>Hello World!</p>";

const Editor = () => {
	const editor = useEditor({
		extensions,
		content,
		editorProps: {
			attributes: {
				class: "focus:outline-none h-screen",
			},
		},
	});

	return (
		<>
			<EditorContent editor={editor} />
			{/* <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu> */}
		</>
	);
};

export default Editor;
