
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

// Get daily seed based on EST midnight
function getDailySeed() {
  const now = new Date();
  const estOffset = -5 * 60 * 60 * 1000; // EST is UTC-5
  const estTime = new Date(now.getTime() + estOffset);
  const midnightEST = new Date(estTime);
  midnightEST.setHours(0, 0, 0, 0);
  return Math.floor(midnightEST.getTime() / 86400000); // Days since epoch
}

// Get today's target word
function getTodaysWord() {
  const seed = getDailySeed();
  const index = seed % WORDS.length;
  return WORDS[index];
}

// Check if it's a new day (for page refreshes)
function checkForNewDay() {
  const lastPlayedDate = localStorage.getItem('lastPlayedDate');
  const today = getDailySeed().toString();
  
  if (lastPlayedDate !== today) {
    localStorage.setItem('lastPlayedDate', today);
    initGame(); // Reset game for new day
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  checkForNewDay();
  
  // Optional: Add a timer showing next word change
  updateDailyTimer();
  setInterval(updateDailyTimer, 60000);
});

// Show time until next word change
function updateDailyTimer() {
  const now = new Date();
  const estTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000) - (5 * 3600000));
  const nextMidnight = new Date(estTime);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  
  const diff = nextMidnight - estTime;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  document.getElementById('daily-timer').textContent = 
    `Next word in: ${hours}h ${minutes}m`;
}

function initGame() {
    // Select a random word
    targetWord = getTodaysWord();
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

    keyboard.innerHTML = '';
    
    keyboardLayout.forEach(row => {
        const keyboardRow = document.createElement("div");
        keyboardRow.className = "keyboard-row";
        
        row.forEach(key => {
            const keyEl = document.createElement("button");
            keyEl.className = "key";
            keyEl.dataset.key = key;
            
            // Special handling for Enter and Backspace
            if (key === "Enter") {
                keyEl.classList.add("key-enter");
                keyEl.textContent = "Enter";
            } else if (key === "Backspace") {
                keyEl.classList.add("key-backspace");
                keyEl.innerHTML = "⌫"; // Backspace symbol
            } else {
                keyEl.textContent = key;
                if (key.length > 1) { // For special characters like Ü, Ö, Ä
                    keyEl.classList.add("key-wide");
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
    if (!WORDS.includes(currentGuess)) {
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