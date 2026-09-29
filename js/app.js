const moodRecords = [
  { date: "2026-09-06", mood: 4, note: "Стандартний день" },
  { date: "2026-09-04", mood: 5, note: "Просто гарний день" },
  { date: "2026-09-03", mood: 3, note: "Багато працював" },
];

const MAX_CHARS = 200;

const inputMood = document.querySelector("#mood-value");
const form = document.querySelector("#mood-form");
const inputComment = document.querySelector("#mood-comment");
const charCounter = document.querySelector("#char-counter");
const listContainer = document.querySelector("#mood-history");

// Перевіряє, що настрій це ціле число від 1 до 6
function validateMoodInput() {
  const raw = inputMood.value.trim();
  const value = Number(raw);

  if (raw === "") {
    inputMood.setCustomValidity("Введіть оцінку настрою від 1 до 6.");
  } else if (!Number.isInteger(value)) {
    inputMood.setCustomValidity("Настрій має бути цілим числом.");
  } else if (value < 1 || value > 6) {
    inputMood.setCustomValidity("Настрій має бути в діапазоні від 1 до 6.");
  } else {
    inputMood.setCustomValidity("");
  }
}

inputMood.addEventListener("input", validateMoodInput);

// Перетворює числову оцінку настрою на CSS клас що відповідає цьому настрою
const moodToLabel = (mood) => {
  const classes = {
    1: "card--very-sad",
    2: "card--sad",
    3: "card--tired",
    4: "card--calm",
    5: "card--happy",
    6: "card--amazing",
  };
  return classes[mood];
};

// Обчислює середній настрій та повертає його числове значення
function getMiddleValueOfMood() {
  if (moodRecords.length === 0) {
    console.log("Записів ще немає.");
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < moodRecords.length; i++) {
    sum += moodRecords[i].mood;
  }
  return sum / moodRecords.length;
}

// Зчитує настрій з форми додає запис в масив та виклик розрахунок
function addMoodRecord(event) {
  event.preventDefault();

  validateMoodInput();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const currentMood = Number(inputMood.value);
  const currentDate = new Date().toLocaleDateString("sv-SE");
  const noteText = inputComment.value.trim();

  moodRecords.push({
    date: currentDate,
    mood: currentMood,
    note: noteText,
  });

  renderMoodHistory(moodRecords);
  updateSummaryUI(getMiddleValueOfMood());

  form.reset();
  charCounter.textContent = `Залишилось символів: ${MAX_CHARS}`;
}

// Оновлює блоки з записами настрою
function renderMoodHistory(records) {
  listContainer.innerHTML = "";

  records.forEach((record) => {
    const card = document.createElement("article");
    card.classList.add("card");

    card.classList.add(moodToLabel(record.mood));
    card.dataset.mood = record.mood;

    const dateTitle = document.createElement("h3");
    dateTitle.textContent = record.date;
    const noteText = document.createElement("p");
    noteText.textContent = record.note;

    card.append(dateTitle, noteText);
    listContainer.append(card);
  });
}

// Оновлює UI з підсумком настрою
function updateSummaryUI(average_value) {
  const status = average_value >= 3.5 ? "гарний тиждень" : "важкий тиждень";
  const avgElement = document.querySelector("#avg-mood");
  if (avgElement) {
    avgElement.textContent = `Середній настрій: ${average_value.toFixed(1)} / 6 (${status})`;
  }
}

// Обробник події для лічильника символів
inputComment.addEventListener("input", () => {
  const remaining = MAX_CHARS - inputComment.value.length;
  charCounter.textContent = `Залишилось символів: ${remaining}`;

  if (inputComment.value.length > 0 && inputComment.value.trim().length === 0) {
    inputComment.setCustomValidity(
      "Нотатка не може складатися лише з пробілів.",
    );
  } else {
    inputComment.setCustomValidity("");
  }
});

form.addEventListener("submit", addMoodRecord);

renderMoodHistory(moodRecords);
updateSummaryUI(getMiddleValueOfMood());
