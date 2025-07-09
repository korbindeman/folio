import type { JSONContent } from "@tiptap/react";

export interface Note {
	id: string;
	title: string;
	createdAt: Date;
	updatedAt: Date;
	content: JSONContent;
	parentId: string | null;
}
