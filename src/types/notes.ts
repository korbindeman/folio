import type { JSONContent } from "@tiptap/core";

export interface Note {
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        content: JSONContent | null;
        encryptedContent?: string | null;
        iv?: string | null;
        lockId: string | null;
        lockHash?: string | null;
        parentId: string | null;
}
