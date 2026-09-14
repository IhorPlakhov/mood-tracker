const moodRecords = [
  { date: "2026-09-06", mood: 4, note: "Стандартний день"},
  { date: "2026-09-04", mood: 5, note: "Просто гарний день"},
  { date: "2026-09-03", mood: 3, note: "Багато працював"}
];

const listContainer = document.querySelector('#mood-history');

// Перетворює числову оцінку настрою на CSS клас що відповідає цьому настрою
const moodToLabel = (mood) => {
  const classes = {
    1: "card--very-sad",
    2: "card--sad",
    3: "card--tired",
    4: "card--calm",
    5: "card--happy",
    6: "card--amazing"
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

  const moodScores = {
    very_sad: 1,
    sad: 2,
    tired: 3,
    calm: 4,
    happy: 5,
    amazing: 6
  };

  const selectedInput = document.querySelector('input[name="mood"]:checked');
  if (!selectedInput) return;

  const commentInput = document.querySelector('#mood-comment');
  const currentMood = moodScores[selectedInput.value];
  const currentDate = new Date().toISOString().split("T")[0];

  moodRecords.unshift({
    date: currentDate,
    mood: currentMood,
    note: commentInput.value.trim() || "Без опису"
  });

  commentInput.value = '';

  renderMoodHistory(moodRecords);
  updateSummaryUI(getMiddleValueOfMood());
}

// Оновлює блоки з записами настрою
function renderMoodHistory(records) {
  listContainer.innerHTML = '';

  records.forEach(record => {
    const card = document.createElement('article');
    card.classList.add('card');

    card.classList.add(moodToLabel(record.mood));
    card.dataset.mood = record.mood;

    const dateTitle = document.createElement('h3');
    dateTitle.textContent = record.date;
    const noteText = document.createElement('p');
    noteText.textContent = record.note || "Без опису";

    card.append(dateTitle, noteText);
    listContainer.append(card);
  });
}

// Оновлює UI з підсумком настрою
function updateSummaryUI(average_value){
  const status = average_value >= 3.5 ? "гарний тиждень" : "важкий тиждень";
  const avgElement = document.querySelector('#avg-mood');
  if (avgElement) {
    avgElement.textContent = `Середній настрій: ${average_value.toFixed(1)} / 6 (${status})`;
  }
}

document.querySelector("form")?.addEventListener("submit", addMoodRecord);

renderMoodHistory(moodRecords);
updateSummaryUI(getMiddleValueOfMood());