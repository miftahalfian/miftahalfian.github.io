// ====== UI logic ======
class UIHandler {
    constructor() {
        this.wordsInput = document.getElementById("wordsInput");
        this.wordCountInput = document.getElementById("wordCount");
        this.widthInput = document.getElementById("widthInput");
        this.heightInput = document.getElementById("heightInput");
        this.generateBtn = document.getElementById("generateBtn");
        this.exportBtn = document.getElementById("exportBtn");
        this.statusEl = document.getElementById("status");
        this.gridContainer = document.getElementById("gridContainer");
        this.wordsListEl = document.getElementById("wordsList");
        this.loadingOverlay = document.getElementById("loadingOverlay");

        this.lastResult = null;
        this.originalEntries = []; // Menyimpan entri asli

        this.initializeEventListeners();
        this.setupResetButton();
    }

    initializeEventListeners() {
        this.generateBtn.addEventListener("click", () => this.handleGenerate());

        // Tambahkan event listener untuk reset entries ketika input diubah
        this.wordsInput.addEventListener('input', () => {
            this.originalEntries = []; // Reset original entries ketika user mengubah input
        });
    }

    setupResetButton() {
        const resetBtn = document.getElementById("resetBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => this.handleReset());
        }
    }

    handleReset() {
        // Reset ke nilai default
        this.wordsInput.value = "";
        this.wordCountInput.value = "4";
        this.widthInput.value = "15";
        this.heightInput.value = "15";
        this.gridContainer.innerHTML = "";
        this.wordsListEl.innerHTML = "";
        this.statusEl.textContent = "";
        this.exportBtn.disabled = true;
        this.lastResult = null;
        this.originalEntries = [];
    }

    parseEntries(rawLines) {
        const entries = [];
        for (const line of rawLines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const idx = trimmed.indexOf(":");
            if (idx === -1) {
                entries.push({
                    word: trimmed,
                    clue: "",
                    originalLine: trimmed // Simpan line asli untuk penghapusan
                });
            } else {
                const wordPart = trimmed.slice(0, idx).trim();
                const cluePart = trimmed.slice(idx + 1).trim();
                if (!wordPart) continue;
                entries.push({
                    word: wordPart,
                    clue: cluePart,
                    originalLine: trimmed // Simpan line asli untuk penghapusan
                });
            }
        }
        return entries;
    }

    // Method untuk menghapus kata yang sudah dipakai dari text area
    removeUsedWordsFromTextarea(usedWords) {
        const currentLines = this.wordsInput.value.split('\n');
        this.originalEntries = this.parseEntries(currentLines);

        console.log(this.originalEntries.length);

        // Filter out used words
        const remainingEntries = this.originalEntries.filter(entry =>
            !usedWords.some(usedWord =>
                usedWord.word.toUpperCase() === entry.word.toUpperCase()
            )
        );

        console.log(usedWords.length);
        console.log(remainingEntries.length);

        // Update text area dengan entri yang tersisa
        const remainingText = remainingEntries.map(entry => entry.originalLine).join('\n');
        this.wordsInput.value = remainingText;

        return remainingEntries.length;
    }

    // Method untuk mendapatkan semua kata yang digunakan dari hasil terakhir
    getUsedWordsFromLastResult() {
        if (!this.lastResult) return [];

        return this.lastResult.chosenEntries.map(entry => ({
            word: entry.word.toUpperCase(),
            clue: entry.clue
        }));
    }

    async handleGenerate() {
        const rawLines = this.wordsInput.value.split("\n");

        const n = parseInt(this.wordCountInput.value, 10);
        const w = parseInt(this.widthInput.value, 10);
        const h = parseInt(this.heightInput.value, 10);

        const entries = this.parseEntries(rawLines);

        if (!entries.length) {
            this.statusEl.textContent = "Daftar kata kosong atau format tidak sesuai.";
            return;
        }
        if (!Number.isFinite(n) || n <= 0) {
            this.statusEl.textContent = "n harus > 0.";
            return;
        }
        if (!Number.isFinite(w) || !Number.isFinite(h) || w < 3 || h < 3) {
            this.statusEl.textContent = "Width dan height harus minimal 3.";
            return;
        }

        this.statusEl.textContent = "Menyiapkan...";
        this.gridContainer.innerHTML = "";
        this.wordsListEl.innerHTML = "";
        this.exportBtn.disabled = true;
        this.lastResult = null;

        this.showLoading();

        try {
            this.statusEl.textContent = "Sedang membuat teka-teki silang...";
            const result = await generateCrosswordWithNWords(entries, n, w, h, 300);

            if (!result) {
                this.statusEl.textContent =
                    "Gagal menemukan layout dengan semua kata saling bersilangan. Coba kurangi n atau perbesar grid.";
                return;
            }

            this.statusEl.textContent = `Berhasil! Dipakai ${n} kata dari ${entries.length} entri (semua bersilangan).`;

            const numbering = buildNumbering(
                result.grid,
                result.placedWords,
                result.chosenEntries
            );

            this.renderGrid(result.grid, numbering.cellNumbers);
            this.renderClues(numbering.acrossClues, numbering.downClues);

            this.lastResult = {
                grid: result.grid,
                placedWords: result.placedWords,
                chosenEntries: result.chosenEntries
            };
            this.exportBtn.disabled = false;

            // Hapus kata yang sudah dipakai dari text area
            const usedWords = this.getUsedWordsFromLastResult();
            const remainingCount = this.removeUsedWordsFromTextarea(usedWords);

            // Update status dengan informasi kata yang tersisa
            this.statusEl.textContent += ` ${remainingCount} kata tersisa.`;

        } catch (err) {
            console.error(err);
            this.statusEl.textContent = "Error: " + (err && err.message ? err.message : String(err));
        } finally {
            this.hideLoading();
        }
    }

    renderGrid(grid, cellNumbers) {
        const table = document.createElement("table");
        table.className = "grid";

        grid.forEach((row, r) => {
            const tr = document.createElement("tr");
            row.forEach((cell, c) => {
                const td = document.createElement("td");
                if (cell === "#") {
                    td.className = "block";
                    td.textContent = "";
                } else {
                    td.className = "letter";

                    const key = `${r},${c}`;
                    const num = cellNumbers.get(key);

                    if (num != null) {
                        const numSpan = document.createElement("span");
                        numSpan.className = "cell-num";
                        numSpan.textContent = String(num);
                        td.appendChild(numSpan);
                    }

                    const letterSpan = document.createElement("span");
                    letterSpan.className = "cell-letter";
                    letterSpan.textContent = cell;
                    td.appendChild(letterSpan);
                }
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        this.gridContainer.innerHTML = "";
        this.gridContainer.appendChild(table);
    }

    escapeHtml(str) {
        return str.replace(/[&<>"']/g, ch => {
            switch (ch) {
                case "&": return "&amp;";
                case "<": return "&lt;";
                case ">": return "&gt;";
                case '"': return "&quot;";
                case "'": return "&#39;";
                default: return ch;
            }
        });
    }

    renderClues(acrossClues, downClues) {
        let html = "";

        html += "<h3>Across</h3>";
        if (acrossClues.length === 0) {
            html += "<p><em>Tidak ada.</em></p>";
        } else {
            html += "<ul>";
            acrossClues.forEach(c => {
                html += `<li><strong>${c.number}.</strong> ${this.escapeHtml(c.clue || "")} <span style="opacity:.7">(${this.escapeHtml(c.word)})</span></li>`;
            });
            html += "</ul>";
        }

        html += "<h3>Down</h3>";
        if (downClues.length === 0) {
            html += "<p><em>Tidak ada.</em></p>";
        } else {
            html += "<ul>";
            downClues.forEach(c => {
                html += `<li><strong>${c.number}.</strong> ${this.escapeHtml(c.clue || "")} <span style="opacity:.7">(${this.escapeHtml(c.word)})</span></li>`;
            });
            html += "</ul>";
        }

        this.wordsListEl.innerHTML = html;
    }

    showLoading() {
        this.loadingOverlay.classList.add("active");
    }

    hideLoading() {
        this.loadingOverlay.classList.remove("active");
    }

    getLastResult() {
        return this.lastResult;
    }
}

// Initialize UI Handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiHandler = new UIHandler();
});