// ====== Export JSON ======
class ExportHandler {
    constructor(uiHandler) {
        this.uiHandler = uiHandler;
        this.exportBtn = document.getElementById("exportBtn");

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.exportBtn.addEventListener("click", () => this.handleExport());
    }

    handleExport() {
        const lastResult = this.uiHandler.getLastResult();
        if (!lastResult) {
            alert("Belum ada teka-teki yang berhasil dibuat.");
            return;
        }

        const { grid, placedWords, chosenEntries } = lastResult;
        const total_row = grid.length;
        const total_column = grid[0]?.length || 0;

        const wordToClue = new Map();
        chosenEntries.forEach(e => {
            wordToClue.set(e.word.toUpperCase(), e.clue);
        });

        const list = placedWords
            .map(pw => ({
                number: pw.number ?? 99999,
                row: pw.row,
                col: pw.col,
                direction: pw.direction === "ACROSS" ? "horizontal" : "vertical",
                answer: pw.word,
                question: wordToClue.get(pw.word.toUpperCase()) || ""
            }))
            .sort((a, b) => {
                if (a.number !== b.number) return a.number - b.number;

                if (a.direction === "horizontal" && b.direction === "vertical") return -1;
                if (a.direction === "vertical" && b.direction === "horizontal") return 1;

                return 0;
            });

        const finalList = list.map(item => ({
            row: item.row,
            col: item.col,
            direction: item.direction,
            answer: item.answer,
            question: item.question
        }));

        const jsonData = {
            total_row,
            total_column,
            "list": finalList
        };

        this.downloadJSON(jsonData, "crossword.json");
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize Export Handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for UIHandler to be initialized
    setTimeout(() => {
        if (window.uiHandler) {
            window.exportHandler = new ExportHandler(window.uiHandler);
        }
    }, 100);
});