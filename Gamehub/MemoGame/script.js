const cardSymbols = [
  '🍎', '🍌', '🍊', '🍇', '🍓', '🍒', '🍑', '🍍', 
  '🥝', '🍅', '🥑', '🥕', '🌽', '🥔', '🍄', '🌰',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🦁', '🐯', '🐨', '🐮', '🐷', '🐸', '🐵', '🐔'
];

const board = document.getElementById('game-board');
const livesDisplay = document.getElementById('lives');
const message = document.getElementById('message');
const messageText = document.getElementById('message-text');
const nextLevelText = document.getElementById('next-level-text');
const nextLevelButton = document.getElementById('next-level-button');
const goHomeButton = document.getElementById('go-home');

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchesFound = 0;
let totalPairs = 0;
let lives = 3;
let boardSize = 2; // deafult 2x2
let moves = 0; // moves counter 
let gameStartTime; 

// checking size from url
const urlParams = new URLSearchParams(window.location.search);
boardSize = parseInt(urlParams.get('size')) || 2; // deafult 2x2

// starting game
document.addEventListener('DOMContentLoaded', function() {
  startGame(boardSize);
});

function startGame(size) {
  board.innerHTML = '';  
  message.classList.add('hidden');
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchesFound = 0;
  boardSize = size;
  moves = 0;
  gameStartTime = Date.now();
  
  setLivesByBoardSize(size);
  
  const numCards = size * size;
  totalPairs = Math.floor(numCards / 2);
  
  // random symbols from cardSymbols
  const selectedSymbols = shuffleArray([...cardSymbols]).slice(0, totalPairs);
  const gameSymbols = shuffleArray([...selectedSymbols, ...selectedSymbols]);

  board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${size}, 1fr)`;
  
  adjustBoardSize(size);

  // delay to add animation 
  gameSymbols.forEach((symbol, index) => {
    setTimeout(() => {
      const card = createCard(symbol);
      board.appendChild(card);
      setTimeout(() => {
        card.classList.add('appear');
      }, 50);
    }, index * 30);
  });
}

function setLivesByBoardSize(size) {
  switch(size) {
    case 2:
      lives = 3;
      break;
    case 4:
      lives = 6;
      break;
    case 6:
      lives = 12;
      break;
    case 8:
      lives = 0; // no lives for hardest lvl
      break;
    default:
      lives = 3;
  }
  updateLives();
}

function adjustBoardSize(size) {
  let maxWidth;
  let cardSize;
  
  switch(size) {
    case 2:
      maxWidth = '220px';
      cardSize = '90px';
      break;
    case 4:
      maxWidth = '380px';
      cardSize = '80px';
      break;
    case 6:
      maxWidth = '520px';
      cardSize = '70px';
      break;
    case 8:
      maxWidth = '660px';
      cardSize = '70px';
      break;
    default:
      maxWidth = '380px';
      cardSize = '80px';
  }
  
  board.style.maxWidth = maxWidth;
  
  document.documentElement.style.setProperty('--card-size', cardSize);
}

function createCard(symbol) {
  const card = document.createElement('div');
  card.classList.add('card');
  card.dataset.symbol = symbol;
  card.innerText = '';

  card.addEventListener('click', function() {
    flipCard(card);
  });

  return card;
}

function flipCard(card) {
  if (lockBoard) return;
  if (card === firstCard) return; // same card was clicked 
  if (card.classList.contains('flipped')) return; // card already flipped

  card.classList.add('flipped');
  card.innerText = card.dataset.symbol;

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;
  moves++;

  checkForMatch();
}

function checkForMatch() {
  if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);
    resetBoard();
    matchesFound++;
    
    // Odtwarzanie dźwięku przy dopasowaniu kart
    playCorrectSound();

    if (matchesFound === totalPairs) {
      // counting game time
      const gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
      setTimeout(() => {
        playWinSound();
        endGame(true, gameTime);
      }, 500);
    }
  } else {
    // not matched
    if (lives > 0) {
      lives--;
      updateLives();
    }

    // Odtwarzanie dźwięku przy błędnym dopasowaniu
    playWrongSound();

    if (lives === 0 && boardSize !== 8) {  // not ending lvl even if lives == 0
      setTimeout(() => {
        playLoseSound();
        endGame(false);
      }, 1000);
    } else {
      setTimeout(() => {
        firstCard.classList.add('wrong');
        secondCard.classList.add('wrong');
        
        setTimeout(() => {
          firstCard.classList.remove('flipped', 'wrong');
          secondCard.classList.remove('flipped', 'wrong');
          firstCard.innerText = '';
          secondCard.innerText = '';
          resetBoard();
        }, 600);
      }, 600);
    }
  }
}

function resetBoard() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

function updateLives() {
  if (boardSize === 8) {
    livesDisplay.innerHTML = '<span class="expert-badge">Poziom ekspercki - brak żyć</span>';
    livesDisplay.classList.add('expert-level');
  } else {
    // loss of life animation
    livesDisplay.classList.add('lives-update');
    setTimeout(() => {
      livesDisplay.classList.remove('lives-update');
    }, 500);
    
    livesDisplay.innerHTML = '❤️'.repeat(lives);
    livesDisplay.classList.remove('expert-level');
  }
}

function centerNextLevelButton() {
  const nextLevelButton = document.getElementById('next-level-button');
  if (nextLevelButton) {
    nextLevelButton.style.margin = '15px auto';
    nextLevelButton.style.display = 'block';
  }
}

function endGame(won, gameTime = 0) {
  message.classList.remove('hidden');
  
  if (won) {
      const scoreText = `
        <div class="score-info">
          <p>Liczba ruchów: ${moves}</p>
          <p>Czas gry: ${gameTime} sekund</p>
        </div>
      `;
      
      messageText.innerHTML = `<div class="win-message">Gratulacje! 🎉</div> ${scoreText}`;
  } else {
      messageText.innerHTML = '<div class="lose-message">Koniec gry! 😢</div>';
  }
  
  const nextLevelDiv = document.getElementById('next-level');
  
  if (won) {
      // another lvl proposal 
      const nextSize = boardSize + 2 <= 8 ? boardSize + 2 : null;
      if (nextSize) {
        nextLevelDiv.style.display = 'block';
        nextLevelText.innerHTML = `Gratulacje! Spróbuj teraz poziomu <strong>${nextSize}x${nextSize}</strong>!`;
        nextLevelButton.style.display = 'block';
        centerNextLevelButton();
      } else {
        nextLevelDiv.style.display = 'block';
        nextLevelText.innerHTML = '<strong>Brawo!</strong> Ukończyłeś wszystkie poziomy!';
        nextLevelButton.style.display = 'none';
        goHomeButton.classList.remove('hidden');
      }
    } else {
      // after lose back to index proposal
      nextLevelDiv.style.display = 'none';
      goHomeButton.classList.remove('hidden');
    }
  }

function restartGame() {
  startGame(boardSize);
}

function startNextLevel() {
  window.location.href = `game.html?size=${boardSize + 2}`;
}

function goHome() {
  window.location.href = 'index.html';
}

function shuffleArray(array) {
  const newArray = [...array]; // making a copy of arr
  let currentIndex = newArray.length, temporaryValue, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    temporaryValue = newArray[currentIndex];
    newArray[currentIndex] = newArray[randomIndex];
    newArray[randomIndex] = temporaryValue;
  }

  return newArray;
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
