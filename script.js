// Valid guesses (could be larger than WORDS)
const VALID_GUESSES = [...WORDS];

// Game state
let targetWord = "";
let currentGuess = "";
let guesses = [];
let gameOver = false;

// DOM elements
const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restart-btn");


function initGame() {
    // Select a random word
    targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    console.log(targetWord)
    currentGuess = "";
    guesses = [];
    gameOver = false;
    messageEl.textContent = "";

    // Create board
    board.innerHTML = "";
    for (let i = 0; i < 6; i++) {
        const row = document.createElement("div");
        row.className = "row";
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            row.appendChild(tile);
        }
        board.appendChild(row);
    }

    createKeyboard();
    
    // Add event listeners
    document.addEventListener("keydown", handleKeyDown);
    restartBtn.addEventListener("click", initGame);
}

function createKeyboard() {
    const keyboardLayout = [
        ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"],
        ["Enter", "Y", "X", "C", "V", "B", "N", "M", "Backspace"]
    ];

    keyboard.innerHTML = "";
    
    keyboardLayout.forEach(row => {
        const keyboardRow = document.createElement("div");
        keyboardRow.className = "keyboard-row";
        
        row.forEach(key => {
            const keyEl = document.createElement("button");
            keyEl.className = "key";
            keyEl.textContent = key;
            keyEl.dataset.key = key;
            
            if (key.length > 1) {
                if (key === "Enter") {
                    keyEl.classList.add("key-extra-wide", "key-enter");
                } else {
                    keyEl.classList.add("key-wide", "key-backspace");
                    keyEl.innerHTML = "⌫"; // Backspace symbol
                }
            }
            
            keyEl.addEventListener("click", () => handleKeyPress(key));
            keyboardRow.appendChild(keyEl);
        });
        
        keyboard.appendChild(keyboardRow);
    });
}

// Handle keyboard input
function handleKeyDown(e) {
    if (gameOver) return;

    const key = e.key.toUpperCase();
    if (key === "ENTER") {
        handleKeyPress("Enter");
    } else if (key === "BACKSPACE") {
        handleKeyPress("Backspace");
    } else if (/^[A-ZÄÖÜ]$/.test(key)) {
        handleKeyPress(key);
    }
}

// Handle key press
function handleKeyPress(key) {
    if (gameOver) return;

    if (key === "Enter" && currentGuess.length === 5) {
        submitGuess();
    } else if (key === "Backspace") {
        currentGuess = currentGuess.slice(0, -1);
        updateBoard();
    } else if (/^[A-ZÄÖÜ]$/.test(key) && currentGuess.length < 5) {
        currentGuess += key.toLowerCase();
        updateBoard();
    }
}

// Update the board with current guess
function updateBoard() {
    const row = board.children[guesses.length];
    for (let i = 0; i < 5; i++) {
        const tile = row.children[i];
        tile.textContent = currentGuess[i] || "";
    }
}

// Submit a guess
function submitGuess() {
    if (!VALID_GUESSES.includes(currentGuess)) {
        messageEl.textContent = "Wort nicht im Wörterbuch";
        return;
    }

    guesses.push(currentGuess);

    // Update tile states
    const row = board.children[guesses.length - 1];
    const targetLetters = targetWord.split("");

    // First pass: mark correct letters
    for (let i = 0; i < 5; i++) {
        const tile = row.children[i];
        const letter = currentGuess[i];
        if (letter === targetLetters[i]) {
            tile.dataset.state = "correct";
            targetLetters[i] = null; // Mark as used
        }
    }

    // Second pass: mark present letters
    for (let i = 0; i < 5; i++) {
        const tile = row.children[i];
        if (tile.dataset.state) continue; // Skip already marked tiles

        const letter = currentGuess[i];
        const index = targetLetters.indexOf(letter);
        if (index !== -1) {
            tile.dataset.state = "present";
            targetLetters[index] = null; // Mark as used
        } else {
            tile.dataset.state = "absent";
        }
    }

    // Update keyboard keys
    updateKeyboard();

    // Check for win/lose
    if (currentGuess === targetWord) {
        messageEl.textContent = `Gewonnen! Das Wort war ${targetWord.toUpperCase()}`;
        gameOver = true;
    } else if (guesses.length === 6) {
        messageEl.textContent = `Verloren! Das Wort war ${targetWord.toUpperCase()}`;
        gameOver = true;
    }

    currentGuess = "";
}

// Update keyboard key colors
function updateKeyboard() {
    const keyStates = {};

    // Collect all letter states from guesses
    for (const guess of guesses) {
        const targetLetters = targetWord.split("");
        
        // First pass: correct letters
        for (let i = 0; i < 5; i++) {
            const letter = guess[i].toUpperCase();
            if (letter.toLowerCase() === targetLetters[i]) {
                keyStates[letter] = "correct";
                targetLetters[i] = null;
            }
        }

        // Second pass: present letters
        for (let i = 0; i < 5; i++) {
            const letter = guess[i].toUpperCase();
            if (keyStates[letter] === "correct") continue;

            const index = targetLetters.indexOf(letter.toLowerCase());
            if (index !== -1) {
                keyStates[letter] = "present";
                targetLetters[index] = null;
            } else if (!keyStates[letter]) {
                keyStates[letter] = "absent";
            }
        }
    }

    // Apply states to keyboard
    for (const key of document.querySelectorAll(".key")) {
        const letter = key.dataset.key;
        if (keyStates[letter]) {
            key.dataset.state = keyStates[letter];
        }
    }
}

// Start the game
initGame();