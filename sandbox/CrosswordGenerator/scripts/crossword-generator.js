// ====== Crossword Generator core (semua kata harus bersilangan) ======

class CrosswordGenerator {
    constructor(words, width, height) {
        this.width = width;
        this.height = height;

        this.words = words
            .map(w => w.replace(/\s+/g, "").toUpperCase())
            .filter(w => w.length > 0);

        this.words.sort((a, b) => b.length - a.length);

        this.grid = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => null)
        );
        this.placedWords = [];
    }

    generate() {
        const success = this.placeWordRecursively(0);
        if (!success) return null;

        if (!this.allWordsHaveIntersection()) return null;

        const finalGrid = this.grid.map(row =>
            row.map(cell => (cell === null ? "#" : cell))
        );

        return {
            grid: finalGrid,
            placedWords: this.placedWords.slice()
        };
    }

    placeWordRecursively(index) {
        if (index >= this.words.length) {
            return true;
        }

        const word = this.words[index];

        if (index === 0) {
            const startRow = Math.floor(this.height / 2);
            const startCol = Math.max(0, Math.floor((this.width - word.length) / 2));
            if (this.canPlaceWord(word, startRow, startCol, "ACROSS")) {
                this.placeWord(word, startRow, startCol, "ACROSS");
                if (this.placeWordRecursively(index + 1)) return true;
                this.removeWord(word, startRow, startCol, "ACROSS");
            }
        }

        const candidatePositions = this.generateCandidatePositions(word);
        for (const pos of candidatePositions) {
            const { row, col, direction } = pos;
            if (this.canPlaceWord(word, row, col, direction)) {
                this.placeWord(word, row, col, direction);
                if (this.placeWordRecursively(index + 1)) return true;
                this.removeWord(word, row, col, direction);
            }
        }

        const randomPositions = this.generateRandomPositions(word);
        for (const pos of randomPositions) {
            const { row, col, direction } = pos;
            if (this.canPlaceWord(word, row, col, direction)) {
                this.placeWord(word, row, col, direction);
                if (this.placeWordRecursively(index + 1)) return true;
                this.removeWord(word, row, col, direction);
            }
        }

        return false;
    }

    generateCandidatePositions(word) {
        const candidates = [];
        if (this.placedWords.length === 0) return candidates;

        for (let i = 0; i < word.length; i++) {
            const ch = word[i];

            for (const placed of this.placedWords) {
                const existingWord = placed.word;
                const baseRow = placed.row;
                const baseCol = placed.col;
                const direction = placed.direction;

                for (let j = 0; j < existingWord.length; j++) {
                    if (existingWord[j] !== ch) continue;

                    if (direction === "ACROSS") {
                        const newRow = baseRow - i;
                        const newCol = baseCol + j;
                        candidates.push({
                            word,
                            row: newRow,
                            col: newCol,
                            direction: "DOWN"
                        });
                    } else {
                        const newRow = baseRow + j;
                        const newCol = baseCol - i;
                        candidates.push({
                            word,
                            row: newRow,
                            col: newCol,
                            direction: "ACROSS"
                        });
                    }
                }
            }
        }

        this.shuffleArray(candidates);
        return candidates;
    }

    generateRandomPositions(word) {
        const positions = [];
        const maxAttempts = 40;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const direction = Math.random() < 0.5 ? "ACROSS" : "DOWN";

            let maxRow, maxCol;
            if (direction === "ACROSS") {
                maxRow = this.height;
                maxCol = this.width - word.length + 1;
            } else {
                maxRow = this.height - word.length + 1;
                maxCol = this.width;
            }

            if (maxRow <= 0 || maxCol <= 0) continue;

            const row = this.getRandomInt(0, maxRow);
            const col = this.getRandomInt(0, maxCol);

            positions.push({ word, row, col, direction });
        }

        this.shuffleArray(positions);
        return positions;
    }

    canPlaceWord(word, row, col, direction) {
        if (direction === "ACROSS") {
            if (row < 0 || row >= this.height) return false;
            if (col < 0 || col + word.length > this.width) return false;
        } else {
            if (col < 0 || col >= this.width) return false;
            if (row < 0 || row + word.length > this.height) return false;
        }

        let intersectionCount = 0;

        for (let i = 0; i < word.length; i++) {
            const r = direction === "ACROSS" ? row : row + i;
            const c = direction === "ACROSS" ? col + i : col;
            const cell = this.grid[r][c];

            if (cell !== null && cell !== word[i]) {
                return false;
            }

            if (cell === word[i]) {
                intersectionCount++;
            }

            if (!this.isValidAdjacency(word, i, r, c, direction)) {
                return false;
            }
        }

        if (this.placedWords.length > 0 && intersectionCount === 0) {
            return false;
        }

        if (!this.checkWordBoundary(word, row, col, direction)) {
            return false;
        }

        return true;
    }

    placeWord(word, row, col, direction) {
        for (let i = 0; i < word.length; i++) {
            const r = direction === "ACROSS" ? row : row + i;
            const c = direction === "ACROSS" ? col + i : col;
            this.grid[r][c] = word[i];
        }
        this.placedWords.push({ word, row, col, direction });
    }

    removeWord(word, row, col, direction) {
        for (let i = 0; i < word.length; i++) {
            const r = direction === "ACROSS" ? row : row + i;
            const c = direction === "ACROSS" ? col + i : col;
            const letter = word[i];

            if (this.grid[r][c] === letter) {
                if (!this.isCellUsedByAnotherWord(r, c, word)) {
                    this.grid[r][c] = null;
                }
            }
        }

        const idx = this.placedWords.findIndex(
            w =>
                w.word === word &&
                w.row === row &&
                w.col === col &&
                w.direction === direction
        );
        if (idx !== -1) {
            this.placedWords.splice(idx, 1);
        }
    }

    isCellUsedByAnotherWord(r, c, currentWord) {
        for (const placed of this.placedWords) {
            if (placed.word === currentWord) continue;
            const w = placed.word;
            const baseRow = placed.row;
            const baseCol = placed.col;
            const dir = placed.direction;

            for (let i = 0; i < w.length; i++) {
                const rr = dir === "ACROSS" ? baseRow : baseRow + i;
                const cc = dir === "ACROSS" ? baseCol + i : baseCol;

                if (rr === r && cc === c) return true;
            }
        }
        return false;
    }

    isValidAdjacency(word, index, r, c, direction) {
        const cell = this.grid[r][c];
        if (cell === word[index]) return true;

        if (direction === "ACROSS") {
            if (this.isLetter(r - 1, c)) return false;
            if (this.isLetter(r + 1, c)) return false;
        } else {
            if (this.isLetter(r, c - 1)) return false;
            if (this.isLetter(r, c + 1)) return false;
        }

        return true;
    }

    checkWordBoundary(word, row, col, direction) {
        if (direction === "ACROSS") {
            const beforeCol = col - 1;
            const afterCol = col + word.length;

            if (beforeCol >= 0 && this.isLetter(row, beforeCol)) return false;
            if (afterCol < this.width && this.isLetter(row, afterCol)) return false;
        } else {
            const beforeRow = row - 1;
            const afterRow = row + word.length;

            if (beforeRow >= 0 && this.isLetter(beforeRow, col)) return false;
            if (afterRow < this.height && this.isLetter(afterRow, col)) return false;
        }
        return true;
    }

    isLetter(r, c) {
        if (r < 0 || r >= this.height || c < 0 || c >= this.width) return false;
        return this.grid[r][c] !== null;
    }

    allWordsHaveIntersection() {
        for (const pw of this.placedWords) {
            if (!this.wordHasIntersection(pw)) {
                return false;
            }
        }
        return true;
    }

    wordHasIntersection(pw) {
        const { word, row, col, direction } = pw;

        for (let i = 0; i < word.length; i++) {
            const r = direction === "ACROSS" ? row : row + i;
            const c = direction === "ACROSS" ? col + i : col;

            if (this.isCellUsedByAnotherWord(r, c, word)) {
                return true;
            }
        }

        return false;
    }

    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
}

// ====== Generate crossword dengan tepat N kata ======
async function generateCrosswordWithNWords(entries, wordCount, width, height, maxAttempts = 200) {
    const maxLen = Math.max(width, height);

    const filtered = entries
        .map(e => ({
            word: e.word.replace(/\s+/g, "").toUpperCase(),
            clue: e.clue
        }))
        .filter(e => e.word.length > 0 && e.word.length <= maxLen);

    if (filtered.length < wordCount) {
        throw new Error("Jumlah kata yang layak lebih sedikit dari n. Kurangi n atau tambah entri.");
    }

    function pickSubsetHeuristic() {
        const sorted = [...filtered].sort((a, b) => b.word.length - a.word.length);
        return sorted.slice(0, wordCount);
    }

    function pickSubsetRandom() {
        const pool = [...filtered];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, wordCount);
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const chosenEntries = attempt === 1 ? pickSubsetHeuristic() : pickSubsetRandom();
        const chosenWords = chosenEntries.map(e => e.word);

        const generator = new CrosswordGenerator(chosenWords, width, height);
        const result = generator.generate();

        console.log("total attempt: " + attempt);

        if (result && result.placedWords.length === wordCount) {
            return {
                grid: result.grid,
                placedWords: result.placedWords,
                chosenEntries
            };
        }

        await new Promise(resolve => setTimeout(resolve, 0));
    }

    return null;
}

// ====== Penomoran & clue (ACROSS / DOWN) ======
function buildNumbering(grid, placedWords, chosenEntries) {
    const height = grid.length;
    const width = grid[0].length;

    const wordToClue = new Map();
    chosenEntries.forEach(e => {
        wordToClue.set(e.word.toUpperCase(), e.clue);
    });

    const cellNumbers = new Map();
    const acrossClues = [];
    const downClues = [];

    let number = 1;

    function findPlacedWordAt(row, col, dir) {
        return placedWords.find(
            pw => pw.row === row && pw.col === col && pw.direction === dir
        );
    }

    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            if (grid[r][c] === "#") continue;

            const isStartAcross =
                (c === 0 || grid[r][c - 1] === "#") &&
                c + 1 < width &&
                grid[r][c + 1] !== "#";

            const isStartDown =
                (r === 0 || grid[r - 1][c] === "#") &&
                r + 1 < height &&
                grid[r + 1][c] !== "#";

            if (!isStartAcross && !isStartDown) continue;

            const key = `${r},${c}`;
            const currentNumber = number++;
            cellNumbers.set(key, currentNumber);

            if (isStartAcross) {
                const pw = findPlacedWordAt(r, c, "ACROSS");
                if (pw) {
                    pw.number = currentNumber;
                    const clue = wordToClue.get(pw.word.toUpperCase()) || "";
                    acrossClues.push({
                        number: currentNumber,
                        word: pw.word,
                        clue
                    });
                }
            }

            if (isStartDown) {
                const pw = findPlacedWordAt(r, c, "DOWN");
                if (pw) {
                    pw.number = currentNumber;
                    const clue = wordToClue.get(pw.word.toUpperCase()) || "";
                    downClues.push({
                        number: currentNumber,
                        word: pw.word,
                        clue
                    });
                }
            }
        }
    }

    return { cellNumbers, acrossClues, downClues };
}