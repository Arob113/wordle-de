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

// --- Time + Word Selection Utilities ---

// PRNG: deterministic based on date
function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Get date string in America/New_York (handles DST)
function getNYDateKey() {
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcTime = new Date(Date.UTC(utcYear, utcMonth, utcDate, utcHours, utcMinutes));
  const nyTimeStr = utcTime.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyTimeStr);
  nyDate.setHours(0, 0, 0, 0);
  return nyDate.toISOString().split("T")[0];
}

// Get today's word using PRNG and avoid repeats
function getTodaysWord() {
  const dateKey = getNYDateKey();
  const savedData = JSON.parse(localStorage.getItem("dailyWordData") || "{}");
  const usedWords = JSON.parse(localStorage.getItem("usedWords") || "[]");

  if (savedData.date === dateKey && savedData.word) {
    return savedData.word;
  }

  let availableWords = WORDS.filter(word => !usedWords.includes(word));
  if (availableWords.length === 0) {
    localStorage.setItem("usedWords", JSON.stringify([]));
    availableWords = [...WORDS];
  }

  const numericSeed = parseInt(dateKey.replace(/-/g, ""));
  const rng = mulberry32(numericSeed);
  const index = Math.floor(rng() * availableWords.length);
  const word = availableWords[index];

  usedWords.push(word);
  localStorage.setItem("usedWords", JSON.stringify(usedWords));
  localStorage.setItem("dailyWordData", JSON.stringify({
    date: dateKey,
    word: word
  }));
  console.log(word)
  return word;
}

function checkForNewDay() {
  const today = getNYDateKey();
  const savedData = JSON.parse(localStorage.getItem("dailyWordData") || "{}");

  if (savedData.date !== today) {
    initGame(); // New day
  } else {
    targetWord = savedData.word;
  }
}

// --- Game Setup ---

document.addEventListener('DOMContentLoaded', () => {
  checkForNewDay();
  initGame();
});

function initGame() {
  targetWord = getTodaysWord();
  currentGuess = "";
  guesses = [];
  gameOver = false;
  messageEl.textContent = "";

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
  document.addEventListener("keydown", handleKeyDown);
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
      if (key === "Enter") {
        keyEl.classList.add("key-enter");
        keyEl.textContent = "Enter";
      } else if (key === "Backspace") {
        keyEl.classList.add("key-backspace");
        keyEl.innerHTML = "⌫";
      } else {
        keyEl.textContent = key;
        if (key.length > 1) keyEl.classList.add("key-wide");
      }
      keyEl.addEventListener("click", () => handleKeyPress(key));
      keyboardRow.appendChild(keyEl);
    });
    keyboard.appendChild(keyboardRow);
  });
}

// --- Input Handling ---

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

// --- Board and Guess Logic ---

function updateBoard() {
  const row = board.children[guesses.length];
  for (let i = 0; i < 5; i++) {
    const tile = row.children[i];
    tile.textContent = currentGuess[i] || "";
  }
}

function submitGuess() {
    if (!WORDS.includes(currentGuess)) {
      messageEl.textContent = "Wort nicht im Wörterbuch";
      return;
    }
  
    guesses.push(currentGuess);
    const row = board.children[guesses.length - 1];
    const targetLetters = targetWord.split("");
    const guessLetters = currentGuess.split("");
  
    // Reveal letters with delay
    guessLetters.forEach((letter, i) => {
      const tile = row.children[i];
  
      setTimeout(() => {
        tile.classList.add("flip");
  
        tile.addEventListener("animationend", () => {
          if (letter === targetLetters[i]) {
            tile.dataset.state = "correct";
            targetLetters[i] = null;
          } else if (targetLetters.includes(letter)) {
            tile.dataset.state = "present";
            targetLetters[targetLetters.indexOf(letter)] = null;
          } else {
            tile.dataset.state = "absent";
          }
          updateKeyboard();
        }, { once: true });
      }, i * 300); // 300ms between each tile flip
    });
  
    setTimeout(() => {
      if (currentGuess === targetWord) {
        messageEl.textContent = `Gewonnen! Das Wort war ${targetWord.toUpperCase()}`;
        gameOver = true;
        showCopyButton();
      } else if (guesses.length === 6) {
        messageEl.textContent = `Verloren! Das Wort war ${targetWord.toUpperCase()}`;
        gameOver = true;
      }
      currentGuess = "";
    }, guessLetters.length * 300 + 600); // Wait until all tiles have flipped
  }

function updateKeyboard() {
  const keyStates = {};
  for (const guess of guesses) {
    const targetLetters = targetWord.split("");
    for (let i = 0; i < 5; i++) {
      const letter = guess[i].toUpperCase();
      if (letter.toLowerCase() === targetLetters[i]) {
        keyStates[letter] = "correct";
        targetLetters[i] = null;
      }
    }
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

  for (const key of document.querySelectorAll(".key")) {
    const letter = key.dataset.key;
    if (keyStates[letter]) {
      key.dataset.state = keyStates[letter];
    }
  }
}

// --- Share Results ---

function showCopyButton() {
  const container = document.createElement("div");
  container.className = "copy-results-container";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy Results";
  copyBtn.className = "copy-results-btn";
  copyBtn.addEventListener("click", copyResultsToClipboard);

  container.appendChild(copyBtn);
  board.parentNode.insertBefore(container, board.nextSibling);
}

function generateResultString() {
  const title = `Wordle de ${getNYDateKey()} - ${guesses.length}/6\n`;
  const grid = guesses.map(guess => {
    return guess.split('').map((letter, i) => {
      if (targetWord[i] === letter) return '🟩';
      if (targetWord.includes(letter)) return '🟨';
      return '⬛';
    }).join('');
  }).join('\n');
  return `${title}${grid}\n\nPlay at: ${window.location.href}`;
}

async function copyResultsToClipboard() {
  const resultString = generateResultString();
  const copyBtn = document.querySelector('.copy-results-btn');

  try {
    await navigator.clipboard.writeText(resultString);
    showCopyFeedback(copyBtn);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = resultString;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showCopyFeedback(copyBtn);
  }
}

function showCopyFeedback(button) {
  button.textContent = 'Copied!';
  button.classList.add('copied');
  setTimeout(() => {
    button.textContent = 'Copy Results';
    button.classList.remove('copied');
  }, 2000);
}
