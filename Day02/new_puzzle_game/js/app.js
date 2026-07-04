const fruitPool = [
  "🍎", "🍌", "🍇", "🍓", "🍒", "🍍", "🥝", "🍑",
  "🍉", "🍋", "🍊", "🥭", "🍐", "🫐", "🥥", "🍈",
  "🍅", "🥑", "🥕", "🌽",
];

const stageSettings = [
  { label: "쉬움", size: 2, timeLimit: 30 },
  { label: "중간1", size: 3, timeLimit: 60 },
  { label: "중간2", size: 4, timeLimit: 90 },
  { label: "어려움", size: 5, timeLimit: 120 },
];

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const endScreen = document.getElementById("endScreen");
const boardElement = document.getElementById("board");
const stageCountElement = document.getElementById("stageCount");
const stageLabelElement = document.getElementById("stageLabel");
const attemptCountElement = document.getElementById("attemptCount");
const scoreCountElement = document.getElementById("scoreCount");
const comboCountElement = document.getElementById("comboCount");
const timeCountElement = document.getElementById("timeCount");
const finalScoreElement = document.getElementById("finalScore");
const messageElement = document.getElementById("message");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const playAgainButton = document.getElementById("playAgainButton");

let firstCard = null;
let secondCard = null;
let boardLocked = false;
let isGameOver = false;
let currentStageIndex = 0;
let currentStage = stageSettings[currentStageIndex];
let attemptCount = 0;
let scoreCount = 0;
let comboBonus = 0;
let timeLeft = 0;
let matchedPairs = 0;
let selectedEmojiList = [];
let hideCardsTimeoutId = null;
let timerIntervalId = null;
let nextStageTimeoutId = null;

function shuffleArray(array) {
  const shuffledArray = [...array];

  for (let index = shuffledArray.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledArray[index], shuffledArray[randomIndex]] = [shuffledArray[randomIndex], shuffledArray[index]];
  }

  return shuffledArray;
}

function getRandomItems(array, count) {
  return shuffleArray(array).slice(0, count);
}

function showOnly(screenElement) {
  startScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  screenElement.classList.remove("hidden");
}

function showStartScreen() {
  stopTimer();
  clearNextStageTimer();
  showOnly(startScreen);
}

function showGameScreen() {
  showOnly(gameScreen);
}

function showEndScreen() {
  stopTimer();
  clearNextStageTimer();
  finalScoreElement.textContent = scoreCount;
  showOnly(endScreen);
}

function setMessage(text, type = "normal") {
  messageElement.textContent = text;
  messageElement.classList.toggle("done", type === "done");
  messageElement.classList.toggle("error", type === "error");
}

function updateStageInfo() {
  stageCountElement.textContent = `${currentStageIndex + 1}/${stageSettings.length}`;
  stageLabelElement.textContent = currentStage.label;
}

function updateAttemptCount() {
  attemptCountElement.textContent = attemptCount;
}

function updateScoreCount() {
  scoreCountElement.textContent = scoreCount;
}

function updateComboCount() {
  comboCountElement.textContent = comboBonus;
}

function showComboPopup(bonusScore) {
  if (bonusScore <= 0) {
    return;
  }

  const popupElement = document.createElement("div");
  popupElement.className = "combo-popup";
  popupElement.textContent = `콤보 +${bonusScore}`;
  boardElement.appendChild(popupElement);

  popupElement.addEventListener("animationend", () => {
    popupElement.remove();
  });
}

function updateTimeCount() {
  timeCountElement.textContent = timeLeft;
}

function stopTimer() {
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function clearNextStageTimer() {
  if (nextStageTimeoutId !== null) {
    clearTimeout(nextStageTimeoutId);
    nextStageTimeoutId = null;
  }
}

function disableAllCards() {
  boardElement.querySelectorAll(".card").forEach((cardElement) => {
    cardElement.disabled = true;
  });
}

function handleGameOver() {
  isGameOver = true;
  boardLocked = true;
  stopTimer();

  if (hideCardsTimeoutId !== null) {
    clearTimeout(hideCardsTimeoutId);
    hideCardsTimeoutId = null;
  }

  disableAllCards();
  setMessage(`게임오버! 제한 시간 안에 모두 맞추지 못했습니다. 점수: ${scoreCount}점`, "error");
}

function startTimer() {
  stopTimer();
  updateTimeCount();

  timerIntervalId = setInterval(() => {
    timeLeft -= 1;

    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimeCount();
      handleGameOver();
      return;
    }

    updateTimeCount();
  }, 1000);
}

function resetSelectedCards() {
  firstCard = null;
  secondCard = null;
  boardLocked = isGameOver;
}

function revealCard(cardElement) {
  cardElement.classList.add("flipped");
}

function hideCard(cardElement) {
  if (!cardElement) {
    return;
  }

  cardElement.classList.remove("flipped");
}

function compareCards() {
  return firstCard.dataset.value === secondCard.dataset.value;
}

function markCardsAsMatched(firstElement, secondElement) {
  firstElement.classList.add("matched");
  secondElement.classList.add("matched");
  firstElement.disabled = true;
  secondElement.disabled = true;
  matchedPairs += 1;
  showComboPopup(comboBonus);
  scoreCount += 10 + comboBonus;
  comboBonus += 2;
  updateScoreCount();
  updateComboCount();
}

function isStageClear() {
  return matchedPairs === selectedEmojiList.length;
}

function handleStageClear() {
  stopTimer();
  boardLocked = true;

  if (currentStageIndex >= stageSettings.length - 1) {
    setMessage(`축하합니다! 모든 단계를 클리어했습니다. 최종 점수: ${scoreCount}점`, "done");
    nextStageTimeoutId = setTimeout(() => {
      showEndScreen();
      nextStageTimeoutId = null;
    }, 1200);
    return;
  }

  setMessage(`${currentStage.label} 단계 클리어! 잠시 후 다음 단계로 이동합니다.`, "done");

  nextStageTimeoutId = setTimeout(() => {
    currentStageIndex += 1;
    startStage();
    nextStageTimeoutId = null;
  }, 1400);
}

function handleMatchedPair() {
  markCardsAsMatched(firstCard, secondCard);
  setMessage("잘 찾았어요! 같은 그림입니다.");
  resetSelectedCards();

  if (isStageClear()) {
    handleStageClear();
  }
}

function handleMismatchedPair() {
  setMessage("다른 그림입니다. 잠깐 뒤에 다시 뒤집어요.");
  comboBonus = 0;
  updateComboCount();

  if (hideCardsTimeoutId !== null) {
    clearTimeout(hideCardsTimeoutId);
  }

  const firstSelectedCard = firstCard;
  const secondSelectedCard = secondCard;

  hideCardsTimeoutId = setTimeout(() => {
    hideCard(firstSelectedCard);
    hideCard(secondSelectedCard);
    setMessage("다시 같은 그림을 찾아보세요.");
    resetSelectedCards();
    hideCardsTimeoutId = null;
  }, 700);
}

function handleSecondSelection(cardElement) {
  secondCard = cardElement;
  attemptCount += 1;
  updateAttemptCount();
  boardLocked = true;

  if (compareCards()) {
    handleMatchedPair();
    return;
  }

  handleMismatchedPair();
}

function handleCardClick(cardElement) {
  if (
    isGameOver ||
    boardLocked ||
    cardElement === firstCard ||
    cardElement.classList.contains("matched")
  ) {
    return;
  }

  revealCard(cardElement);

  if (!firstCard) {
    firstCard = cardElement;
    return;
  }

  handleSecondSelection(cardElement);
}

function createCardElement(emoji) {
  const cardElement = document.createElement("button");
  cardElement.type = "button";
  cardElement.className = "card";
  cardElement.dataset.value = emoji;
  cardElement.setAttribute("aria-label", "카드");

  const cardInnerElement = document.createElement("span");
  cardInnerElement.className = "card-inner";

  const cardBackElement = document.createElement("span");
  cardBackElement.className = "card-face card-back";

  const cardFrontElement = document.createElement("span");
  cardFrontElement.className = "card-face card-front";

  const emojiElement = document.createElement("span");
  emojiElement.className = "emoji";
  emojiElement.textContent = emoji;

  cardFrontElement.appendChild(emojiElement);
  cardInnerElement.appendChild(cardBackElement);
  cardInnerElement.appendChild(cardFrontElement);
  cardElement.appendChild(cardInnerElement);
  cardElement.addEventListener("click", () => handleCardClick(cardElement));

  return cardElement;
}

function createEmptyCardElement() {
  const emptyCardElement = document.createElement("button");
  emptyCardElement.type = "button";
  emptyCardElement.className = "card empty";
  emptyCardElement.disabled = true;
  emptyCardElement.setAttribute("aria-label", "빈 칸");

  const cardInnerElement = document.createElement("span");
  cardInnerElement.className = "card-inner";

  const cardBackElement = document.createElement("span");
  cardBackElement.className = "card-face card-back";

  cardInnerElement.appendChild(cardBackElement);
  emptyCardElement.appendChild(cardInnerElement);

  return emptyCardElement;
}

function updateBoardSize() {
  boardElement.style.setProperty("--board-size", currentStage.size);
  boardElement.style.setProperty("--card-font-size", currentStage.size >= 5 ? "24px" : "30px");
}

function renderBoard() {
  const totalCardCount = currentStage.size * currentStage.size;
  const pairCount = Math.floor(totalCardCount / 2);
  const hasEmptyCard = totalCardCount % 2 === 1;

  selectedEmojiList = getRandomItems(fruitPool, pairCount);
  const cardItemList = shuffleArray([...selectedEmojiList, ...selectedEmojiList]);

  if (hasEmptyCard) {
    const centerIndex = Math.floor(totalCardCount / 2);
    cardItemList.splice(centerIndex, 0, null);
  }

  boardElement.innerHTML = "";
  updateBoardSize();

  cardItemList.forEach((emoji) => {
    const cardElement = emoji === null ? createEmptyCardElement() : createCardElement(emoji);
    boardElement.appendChild(cardElement);
  });
}

function startStage() {
  showGameScreen();
  stopTimer();
  clearNextStageTimer();

  if (hideCardsTimeoutId !== null) {
    clearTimeout(hideCardsTimeoutId);
    hideCardsTimeoutId = null;
  }

  firstCard = null;
  secondCard = null;
  boardLocked = false;
  isGameOver = false;
  attemptCount = 0;
  matchedPairs = 0;
  selectedEmojiList = [];
  currentStage = stageSettings[currentStageIndex];
  timeLeft = currentStage.timeLimit;

  updateStageInfo();
  updateAttemptCount();
  updateScoreCount();
  updateTimeCount();
  setMessage(`${currentStageIndex + 1}단계 ${currentStage.label} 난이도입니다. ${timeLeft}초 안에 같은 그림을 모두 맞춰보세요.`);
  renderBoard();
  startTimer();
}

function resetGame() {
  currentStageIndex = 0;
  scoreCount = 0;
  comboBonus = 0;
  updateComboCount();
  startStage();
}

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", resetGame);

showStartScreen();
