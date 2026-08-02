type HistoryItem = {

    id: string;

    type: "file" | "clipboard";

    name: string;

    size?: number;

    date: number;

};

class HistoryManager {

    private KEY = "socket-history";

    getAll(): HistoryItem[] {

        const raw = localStorage.getItem(

            this.KEY

        );

        if (!raw)
            return [];

        return JSON.parse(raw);

    }

    save(item: HistoryItem) {

        const history = this.getAll();

        history.unshift(item);

        localStorage.setItem(

            this.KEY,

            JSON.stringify(

                history.slice(0, 50)

            )

        );

    }

}

export default new HistoryManager();

export type {

    HistoryItem

};