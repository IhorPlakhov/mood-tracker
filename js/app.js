const MoodEntry = {
  props: {
    id: [Number, String],
    date: String,
    mood: Number,
    note: String,
    email: {
      type: String,
      default: "",
    },
  },
  emits: ["update-mood"],
  computed: {
    emoji() {
      const emojiMap = {
        1: "😭",
        2: "🙁",
        3: "🥱",
        4: "😐",
        5: "😊",
        6: "🤩",
      };
      return emojiMap[this.mood] || "😐";
    },
    moodClass() {
      const classes = {
        1: "card--very-sad",
        2: "card--sad",
        3: "card--tired",
        4: "card--calm",
        5: "card--happy",
        6: "card--amazing",
      };
      return classes[this.mood] || "";
    },
  },
  methods: {
    promoteMood() {
      const nextMood = this.mood >= 6 ? 1 : this.mood + 1;
      this.$emit("update-mood", { id: this.id, newMood: nextMood });
    },
  },
  template: `
    <article class="card" :class="moodClass">
      <div class="card__header">
        <h3>{{ date }}</h3>
        <span class="card__emoji">{{ emoji }}</span>
      </div>
      <small v-if="email" class="card__email">{{ email }}</small>
      <p>{{ note }}</p>
    </article>
  `,
};

const app = Vue.createApp({
  components: {
    MoodEntry,
  },
  data() {
    return {
      moodRecords: [
        { id: 1, date: "2026-09-06", mood: 4, note: "Стандартний день" },
        { id: 2, date: "2026-09-04", mood: 5, note: "Просто гарний день" },
        { id: 3, date: "2026-09-03", mood: 3, note: "Багато працював" },
      ],
    };
  },
  methods: {
    handleMoodUpdate({ id, newMood }) {
      const target = this.moodRecords.find((record) => record.id === id);
      if (target) {
        target.mood = newMood;
        updateSummaryUI(getMiddleValueOfMood());
      }
    },
  },
}).mount("#app");

const MAX_CHARS = 200;
const API_URL = "https://jsonplaceholder.typicode.com/comments?postId=1";
const API_MOOD = 4;

const form = document.querySelector("#mood-form");
const submitButton = form.querySelector('button[type="submit"]');
const inputComment = document.querySelector("#mood-comment");
const charCounter = document.querySelector("#char-counter");
const refreshButton = document.querySelector("#refresh-button");
const inputMood = document.querySelector("#mood-value");
const errorBox = document.querySelector("#error-message");

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
  if (app.moodRecords.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < app.moodRecords.length; i++) {
    sum += app.moodRecords[i].mood;
  }
  return sum / app.moodRecords.length;
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

  app.moodRecords.unshift({
    id: Date.now(),
    date: currentDate,
    mood: currentMood,
    note: noteText,
  });

  updateSummaryUI(getMiddleValueOfMood());

  form.reset();
  if (charCounter) {
    charCounter.textContent = `Залишилось символів: ${MAX_CHARS}`;
  }
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

updateSummaryUI(getMiddleValueOfMood());

// Завантажує записи з JSONPlaceholder: https://jsonplaceholder.typicode.com/comments?postId=1
async function loadData() {
  hideError();
  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Код ${response.status}`);
    const data = await response.json();
    console.log(data);

    const adaptedRecords = data.map((item) => ({
      id: item.id,
      date: item.name,
      note: item.body,
      email: item.email,
      mood: API_MOOD,
    }));

    app.moodRecords.push(...adaptedRecords);
    updateSummaryUI(getMiddleValueOfMood());
  } catch (error) {
    console.error("Не вдалося завантажити записи:", error);
    showError("Записи тимчасово недоступні");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadData);

updateSummaryUI(getMiddleValueOfMood());
loadData();
