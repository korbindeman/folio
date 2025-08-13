export async function hashPassword(password: string): Promise<string> {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(password));
        return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

async function deriveKey(password: string): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(password));
        return crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, [
                "encrypt",
                "decrypt",
        ]);
}

function bufferToBase64(buffer: ArrayBuffer): string {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
}

export async function encryptString(
        password: string,
        data: string,
): Promise<{ ciphertext: string; iv: string }> {
        const key = await deriveKey(password);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(data);
        const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
        return {
                ciphertext: bufferToBase64(encrypted),
                iv: bufferToBase64(iv),
        };
}

export async function decryptString(
        password: string,
        ciphertext: string,
        iv: string,
): Promise<string> {
        const key = await deriveKey(password);
        const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(iv)) },
                key,
                base64ToBuffer(ciphertext),
        );
        return new TextDecoder().decode(decrypted);
}
