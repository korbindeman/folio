import { useState } from "react";

interface PasswordPromptProps {
        mode: "lock" | "unlock";
        onSubmit: (password: string) => void | Promise<void>;
        onCancel: () => void;
}

export default function PasswordPrompt({ mode, onSubmit, onCancel }: PasswordPromptProps) {
        const [password, setPassword] = useState("");
        const [confirm, setConfirm] = useState("");
        const [error, setError] = useState("");

        const handleSubmit = async (e: React.FormEvent) => {
                e.preventDefault();
                if (mode === "lock" && password !== confirm) {
                        setError("Passwords do not match");
                        return;
                }
                await onSubmit(password);
                setPassword("");
                setConfirm("");
                setError("");
        };

        return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <form
                                onSubmit={handleSubmit}
                                className="bg-white p-4 rounded shadow-md w-64 flex flex-col gap-2"
                        >
                                <h2 className="text-lg font-medium">
                                        {mode === "lock" ? "Set Password" : "Enter Password"}
                                </h2>
                                <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="border rounded px-2 py-1"
                                        // biome-ignore lint/a11y/noAutofocus: initial focus intended
                                        autoFocus
                                />
                                {mode === "lock" && (
                                        <input
                                                type="password"
                                                value={confirm}
                                                onChange={(e) => setConfirm(e.target.value)}
                                                placeholder="Confirm"
                                                className="border rounded px-2 py-1"
                                        />
                                )}
                                {error && (
                                        <div className="text-red-500 text-sm" role="alert">
                                                {error}
                                        </div>
                                )}
                                <div className="flex justify-end gap-2 mt-2">
                                        <button
                                                type="button"
                                                onClick={onCancel}
                                                className="px-3 py-1 border rounded"
                                        >
                                                Cancel
                                        </button>
                                        <button type="submit" className="px-3 py-1 border rounded">
                                                OK
                                        </button>
                                </div>
                        </form>
                </div>
        );
}

