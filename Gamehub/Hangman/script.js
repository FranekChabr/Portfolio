const words = {
  easy: [
    "kot", "dom", "pies", "las", "sok", "ser", "oko", "nos", "lek", "gra",
    "bal", "sok", "ryk", "sad", "luz", "mak", "lis", "osa", "tama", "mur"
  ],
  medium: [
    "kotek", "mleko", "kawa", "miska", "zamek", "wagon", "chmura", "słowo", "papier", "taniec",
    "grzyb", "mysz", "kosz", "zegar", "obraz", "lalka", "robot", "ołówek", "dywan", "lampa"
  ],
  hard: [
    "samochód", "telewizor", "komputer", "muzyka", "telefon", "krzyżówka", "słownik", "czekolada", "marchewka", "słonecznik",
    "winogrono", "kalendarz", "biblioteka", "parasolka", "wiewiórka", "żyrafa", "hipopotam", "strażnik", "szmaragd", "skrzypce"
  ],
  expert: [
    "prześcieradło", "rozwiązanie", "województwo", "chociaż", "pierścień", "żółć", "kwintesencja", "pięćdziesiąt", "pszczoła", "szczęście",
    "brzęczenie", "świstak", "więdnięcie", "zwierzchnictwo", "świętość", "jeżynowy", "rzeźbiarz", "źdźbło", "źrebię", "chrząszcz"
  ]
};

// liczba bledow dla kazdej trudnosci
const maxErrors = {
  easy: 5,
  medium: 5,
  hard: 5,
  expert: 5
};

// elementy hangmana
const hangmanParts = [
  "base", "pole", "top", "rope", "head", "body", 
  "left-arm", "right-arm", "left-leg", "right-leg", "face"
];

// global variables
let selectedWord = "";
let difficulty = "";
let guessedLetters = [];
let wrongAttempts = 0;
let gameActive = true;
let startTime;
let totalLettersGuessed = 0;
let hangmanStages = []; // czesci wisielca w 5 

// inicjalizowanie gry
function initGame() {
  const urlParams = new URLSearchParams(window.location.search);
  difficulty = urlParams.get('difficulty') || 'easy';
  
  selectedWord = getRandomWord(difficulty);
  
  guessedLetters = [];
  wrongAttempts = 0;
  gameActive = true;
  totalLettersGuessed = 0;
  
  startTime = Date.now();
  updateTimer();
  
  setupUI();
  
  // klawisze
  document.querySelectorAll('.keyboard-key').forEach(key => {
    key.addEventListener('click', () => {
      if (gameActive) {
        const letter = key.textContent;
        guessLetter(letter);
      }
    });
    
    // reset
    key.classList.remove('correct');
    key.classList.remove('wrong');
  });
  
  resetHangman();
  
  prepareHangmanStages();

  updateAttemptsDisplay();

  drawWord();

  startTimer();
}


function prepareHangmanStages() {
  hangmanStages = [
    ["base"],                        // 1. podstawa
    ["pole"],                        // 2. slupek
    ["top"],                         // 3. gorna belka
    ["rope", "head"],                // 4. lina i glowa
    ["body", "left-arm", "right-arm", "left-leg", "right-leg", "face"] // 5. reszta ciala
  ];
}

function resetHangman() {
  document.querySelectorAll('.hangman-part').forEach(part => {
    part.style.display = 'none';
  });
}

function setupUI() {
  // set liczby prob
  const attemptsContainer = document.getElementById('attempts');
  attemptsContainer.innerHTML = `Pozostałe próby: <span>${maxErrors[difficulty]}</span>`;
  
  const difficultyBadge = document.getElementById('difficulty-badge');
  let difficultyText = "";
  let badgeClass = "";
  
  switch(difficulty) {
    case 'easy':
      difficultyText = "Łatwy";
      badgeClass = "badge-easy";
      break;
    case 'medium':
      difficultyText = "Średni";
      badgeClass = "badge-medium";
      break;
    case 'hard':
      difficultyText = "Trudny";
      badgeClass = "badge-hard";
      break;
    case 'expert':
      difficultyText = "Ekspert";
      badgeClass = "badge-expert";
      break;
  }
  
  difficultyBadge.textContent = difficultyText;
  difficultyBadge.className = `difficulty-badge ${badgeClass}`;
  
  // statystyki
  document.getElementById('game-stats').classList.remove('hidden');
}

function getRandomWord(level) {
  const wordList = words[level];
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex].toUpperCase();
}

function drawWord() {
  const wordContainer = document.getElementById('word-container');
  wordContainer.innerHTML = '';
  
  for (let i = 0; i < selectedWord.length; i++) {
    const letter = selectedWord[i];
    const letterElement = document.createElement('div');
    letterElement.className = 'letter';
    
    if (guessedLetters.includes(letter)) {
      letterElement.textContent = letter;
    } else {
      letterElement.textContent = '_';
    }
    
    wordContainer.appendChild(letterElement);
  }
}

function guessLetter(letter) {
  if (guessedLetters.includes(letter) || !gameActive) {
    return; // litera juz byla zgadywana V koniec
  }
  
  guessedLetters.push(letter);
  totalLettersGuessed++;
  updateLettersGuessedCounter();
  
  const keyElement = Array.from(document.querySelectorAll('.keyboard-key'))
                         .find(key => key.textContent === letter);
  
  if (selectedWord.includes(letter)) { 
    keyElement.classList.add('correct');
    playCorrectSound();
  } else {
    keyElement.classList.add('wrong');
    wrongAttempts++;
    updateAttemptsDisplay();
    updateHangman();
    playWrongSound();
  }
  
  drawWord();
  
  checkGameEnd();
}

function updateAttemptsDisplay() {
  const attemptsContainer = document.getElementById('attempts');
  const remainingAttempts = maxErrors[difficulty] - wrongAttempts;
  attemptsContainer.innerHTML = `Pozostałe próby: <span>${remainingAttempts}</span>`;
  
  if (remainingAttempts <= 2) {
    attemptsContainer.classList.add('low-attempts');
  } else {
    attemptsContainer.classList.remove('low-attempts');
  }
}

function updateHangman() {
  if (wrongAttempts > 0 && wrongAttempts <= hangmanStages.length) {
    const currentStage = hangmanStages[wrongAttempts - 1];
    
    // wszystkie czesci od danego etapu
    currentStage.forEach(partId => {
      const partToShow = document.getElementById(partId);
      partToShow.style.display = 'block';
      
      // animacja pojawiania sie
      partToShow.classList.add('appear-animation');
      setTimeout(() => {
        partToShow.classList.remove('appear-animation');
      }, 500);
    });
  }
}

function checkGameEnd() {
  const allLettersGuessed = [...selectedWord].every(letter => guessedLetters.includes(letter));
  
  if (allLettersGuessed) {
    gameActive = false;
    showWinMessage();
  } else if (wrongAttempts >= maxErrors[difficulty]) {
    gameActive = false;
    showLoseMessage();
  }
}

function showWinMessage() {
  const timeElapsed = calculateTimeElapsed();
  const message = document.getElementById('message');
  const messageText = document.getElementById('message-text');
  const correctWordElement = document.getElementById('correct-word');
  const scoreInfo = document.getElementById('score-info');
  
  messageText.textContent = "Gratulacje! Wygrałeś!";
  messageText.className = 'win-message';
  correctWordElement.textContent = `Odgadnięte słowo: ${selectedWord}`;
  
  // obliczenie wyniku
  const accuracyRate = calculateAccuracy();
  const timeBonus = calculateTimeBonus(timeElapsed);
  const difficultyMultiplier = getDifficultyMultiplier();
  const score = Math.round(accuracyRate * timeBonus * difficultyMultiplier * 100);
  
  scoreInfo.innerHTML = `
    <p>Twój wynik: ${score} punktów</p>
    <p>Czas: ${timeElapsed} sekund</p>
    <p>Celność: ${Math.round(accuracyRate * 100)}%</p>
  `;
  
  message.classList.remove('hidden');
  playWinSound();
  
  saveScore(score);
}

function showLoseMessage() {
  const message = document.getElementById('message');
  const messageText = document.getElementById('message-text');
  const correctWordElement = document.getElementById('correct-word');
  const scoreInfo = document.getElementById('score-info');
  
  messageText.textContent = "Przegrałeś!";
  messageText.className = 'lose-message';
  correctWordElement.textContent = `Prawidłowe słowo: ${selectedWord}`;
  
  scoreInfo.innerHTML = `
    <p>Czas: ${calculateTimeElapsed()} sekund</p>
    <p>Odgadnięte litery: ${countCorrectLetters()}</p>
  `;
  
  message.classList.remove('hidden');
  
  // pokaz calego wisielca
  completeHangman();
  playLoseSound();
}

function completeHangman() {
  hangmanParts.forEach((partId, index) => {
    const part = document.getElementById(partId);
    if (part.style.display !== 'block') {
      setTimeout(() => {
        part.style.display = 'block';
      }, 200 * (index));
    }
  });
}

function countCorrectLetters() {
  return guessedLetters.filter(letter => selectedWord.includes(letter)).length;
}

function calculateAccuracy() {
  if (totalLettersGuessed === 0) return 0;
  const correctGuesses = guessedLetters.filter(letter => selectedWord.includes(letter)).length;
  return correctGuesses / totalLettersGuessed;
}


function calculateTimeBonus(timeElapsed) {
  // im szybciej tym lepszy bonus (max 2)
  const baseTime = 30; // ss
  return Math.max(0.5, Math.min(2.0, baseTime / timeElapsed));
}

function getDifficultyMultiplier() {
  switch(difficulty) {
    case 'easy': return 1.0;
    case 'medium': return 1.5;
    case 'hard': return 2.0;
    case 'expert': return 3.0;
    default: return 1.0;
  }
}

function calculateTimeElapsed() {
  return Math.floor((Date.now() - startTime) / 1000);
}

function saveScore(score) {
  const highScores = JSON.parse(localStorage.getItem('hangmanHighScores') || '{}');
  
  if (!highScores[difficulty]) {
    highScores[difficulty] = [];
  }
  
  highScores[difficulty].push({
    score: score,
    word: selectedWord,
    date: new Date().toISOString()
  });
  // sortowanie wynikow od najwyzszego
  highScores[difficulty].sort((a, b) => b.score - a.score);
  // zachowanie 5 najlepszych wynikow
  highScores[difficulty] = highScores[difficulty].slice(0, 5);
  
  localStorage.setItem('hangmanHighScores', JSON.stringify(highScores));
}

function restartGame() {
  const message = document.getElementById('message');
  message.classList.add('hidden');
  
  initGame();
}

function goToMainMenu() {
  window.location.href = 'index.html';
}

let timerInterval;

function startTimer() {
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  if (!gameActive) {
    clearInterval(timerInterval);
    return;
  }
  
  const timeElapsed = calculateTimeElapsed();
  document.getElementById('time-elapsed').textContent = `Czas: ${timeElapsed}s`;
}


function updateLettersGuessedCounter() {
  document.getElementById('letters-guessed').textContent = `Użyte litery: ${totalLettersGuessed}`;
}


function playCorrectSound() {
  const sound = new Audio('../assets/correct.mp3');
  sound.play();
}

function playWrongSound() {
  const sound = new Audio('../assets/wrong.mp3');
  sound.play();
}

function playWinSound() {
  const sound = new Audio('../assets/win.mp3');
  sound.play();
}

function playLoseSound() {
  const sound = new Audio('../assets/lose.mp3');
  sound.play();
}


document.addEventListener('DOMContentLoaded', () => {
  // tylko jesli jestem na stronie gry
  if (document.getElementById('word-container')) {
    initGame();
  }
});

// obluga fizycznej klawiatury
document.addEventListener('keydown', (event) => {
  if (!gameActive) return;
  
  let key = event.key.toUpperCase();
  
  const polishChars = {
    'Ą': 'Ą', 'Ć': 'Ć', 'Ę': 'Ę', 'Ł': 'Ł', 'Ń': 'Ń',
    'Ó': 'Ó', 'Ś': 'Ś', 'Ź': 'Ź', 'Ż': 'Ż'
  };
  
  if (/^[A-Z]$/.test(key) || polishChars[key]) {
    const keyElements = document.querySelectorAll('.keyboard-key');
    for (const keyElement of keyElements) {
      if (keyElement.textContent === key) {
        keyElement.click();
        break;
      }
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    /* Styl dla klawiatury */
    .keyboard {
      margin-top: 20px;
      max-width: 600px;
      width: 100%;
    }
    
    .keyboard-row {
      display: flex;
      justify-content: center;
      margin-bottom: 5px;
      flex-wrap: wrap;
    }
    
    .keyboard-key {
      width: 36px;
      height: 36px;
      margin: 3px;
      background-color: var(--secondary-color);
      color: var(--text-color);
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .keyboard-key:hover {
      background-color: var(--secondary-hover);
      transform: translateY(-2px);
    }
    
    .keyboard-key.correct {
      background-color: #B7B1F2;
      color: #fff;
    }
    
    .keyboard-key.wrong {
      background-color: var(--primary-color);
      color: #fff;
      opacity: 0.5;
    }
    
    /* Styl dla wyświetlania słowa */
    .word-container {
      display: flex;
      justify-content: center;
      margin: 20px 0;
      min-height: 50px;
    }
    
    .letter {
      width: 30px;
      height: 40px;
      margin: 0 5px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 26px;
      font-weight: bold;
      border-bottom: 3px solid var(--secondary-color);
      color: var(--text-color);
    }
    
    /* Styl dla liczby prób */
    .attempts-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 400px;
      margin-bottom: 15px;
    }
    
    .attempts {
      background-color: rgba(255, 255, 255, 0.9);
      padding: 8px 15px;
      border-radius: 20px;
      font-weight: bold;
      box-shadow: var(--box-shadow);
    }
    
    .attempts span {
      color: var(--primary-color);
      font-size: 18px;
    }
    
    .low-attempts {
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }
    
    /* Styl dla odznak trudności */
    .difficulty-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
    }
    
    .badge-easy {
      background-color: rgba(253, 183, 234, 0.2);
      color: var(--primary-color);
    }
    
    .badge-medium {
      background-color: rgba(255, 220, 204, 0.2);
      color: #FFDCCC;
    }
    
    .badge-hard {
      background-color: rgba(183, 177, 242, 0.2);
      color: var(--secondary-color);
    }
    
    .badge-expert {
      background-color: rgba(166, 158, 232, 0.2);
      color: var(--secondary-hover);
    }
    
    /* Styl dla statystyk gry */
    .game-stats {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      width: 100%;
      max-width: 400px;
      background-color: rgba(255, 255, 255, 0.9);
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 14px;
    }
    
    .hidden {
      display: none !important;
    }
    
    /* Animacja dla pojawiających się części wisielca */
    .appear-animation {
      animation: appear 0.5s ease-in-out;
    }
    
    @keyframes appear {
      0% { opacity: 0; transform: scale(0.5); }
      70% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;
  
  document.head.appendChild(style);
});