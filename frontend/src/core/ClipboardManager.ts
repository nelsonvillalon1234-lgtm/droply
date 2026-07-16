class ClipboardManager {

    async readText(): Promise<string> {

        try {

            return await navigator.clipboard.readText();

        } catch {

            return "";

        }

    }

    async writeText(text: string): Promise<boolean> {

        try {

            await navigator.clipboard.writeText(text);

            return true;

        } catch {

            return false;

        }

    }

}

export default new ClipboardManager();