const moodRecords = [
  { date: "2026-09-06", mood: 4, note: "Стандартний день" },
  { date: "2026-09-04", mood: 5, note: "Просто гарний день" },
  { date: "2026-09-03", mood: 3, note: "Багато працював" },
];

const MAX_CHARS = 200;
const API_URL = "https://jsonplaceholder.typicode.com/comments?postId=1";

const form = document.querySelector("#mood-form");
const submitButton = form.querySelector('button[type="submit"]');
const inputComment = document.querySelector("#mood-comment");
const charCounter = document.querySelector("#char-counter");
const listContainer = document.querySelector("#mood-history");
const refreshButton = document.querySelector("#refresh-button");

const errorBox = document.querySelector("#error-message");

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  refreshButton.hidden = false;
}

function hideError() {
  errorBox.hidden = true;
  refreshButton.hidden = true;
}

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

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const selectedInput = document.querySelector('input[name="mood"]:checked');
  if (!selectedInput) return;

  const currentMood = Number(selectedInput.value);
  const currentDate = new Date().toLocaleDateString("sv-SE");
  const noteText = inputComment.value.trim();

  moodRecords.unshift({
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

// Завантажує записи з JSONPlaceholder
async function loadData() {
  hideError();
  if (submitButton) submitButton.disabled = true;
  listContainer.innerHTML =
    '<p class="loading-state">Завантаження даних...</p>';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Код ${response.status}`);
    const data = await response.json();
    console.log(data);

    const currentMood = Number(
      document.querySelector('input[name="mood"]:checked').value,
    );

    const adaptedRecords = data.map((item) => ({
      date: item.name,
      note: item.body,
      mood: currentMood,
    }));

    moodRecords.push(...adaptedRecords);
    renderMoodHistory(moodRecords);
    updateSummaryUI(getMiddleValueOfMood());
  } catch (error) {
    console.error("Не вдалося завантажити записи:", error);
    renderMoodHistory(moodRecords);
    showError("Записи тимчасово недоступні");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadData);

loadData();
