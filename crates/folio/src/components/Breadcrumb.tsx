import { useEffect, useState } from "react";
import { useNotesContext } from "../context/Notes";
import { useNotes } from "../hooks/useNotes";
import { NoteMetadata } from "../types";

function Breadcrumb({ item }: { item: NoteMetadata }) {
  return <div>{item.path.split("/").pop()}</div>;
}

export default function Breadcrumbs() {
  const { activeNotePath } = useNotesContext();
  const { getAncestors } = useNotes();

  const [items, setItems] = useState<NoteMetadata[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const ancestors = await getAncestors(activeNotePath!);
      setItems(ancestors);
    };
    fetchItems();
  }, [activeNotePath, getAncestors]);

  return (
    <nav>
      {items.map((item, index) => (
        <Breadcrumb key={index} item={item} />
      ))}
    </nav>
  );
}
