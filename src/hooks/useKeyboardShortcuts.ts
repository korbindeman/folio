import { useEffect } from "react";
import { useActiveNote } from "../contexts/ActiveNoteContext";

interface KeyboardShortcutsOptions {
	enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
	const { enabled = true } = options;
	const { navigateBack, navigateForward, canNavigateBack, canNavigateForward } =
		useActiveNote();

	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
			const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

			// Navigation shortcuts
			if (ctrlKey && event.key === "ArrowLeft" && canNavigateBack) {
				event.preventDefault();
				navigateBack();
				return;
			}

			if (ctrlKey && event.key === "ArrowRight" && canNavigateForward) {
				event.preventDefault();
				navigateForward();
				return;
			}

			// Alternative navigation shortcuts using bracket keys
			if (ctrlKey && event.key === "[" && canNavigateBack) {
				event.preventDefault();
				navigateBack();
				return;
			}

			if (ctrlKey && event.key === "]" && canNavigateForward) {
				event.preventDefault();
				navigateForward();
				return;
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		enabled,
		navigateBack,
		navigateForward,
		canNavigateBack,
		canNavigateForward,
	]);
}
