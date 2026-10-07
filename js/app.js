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
    <article class="card" :class="moodClass" @click="promoteMood">
      <div class="card-header">
        <h3>{{ date }}</h3>
        <span class="card-emoji">{{ emoji }}</span>
      </div>
      <small v-if="email" class="card-email">{{ email }}</small>
      <p>{{ note }}</p>
    </article>
  `,
};

const app = Vue.createApp({
  components: {
    MoodEntry,
  },
  data() {
    const savedRecords = loadFromLocalStorage();

    return {
      moodRecords:
        savedRecords.length > 0
          ? savedRecords
          : [
              { id: 1, date: "2026-09-06", mood: 4, note: "Стандартний день" },
              {
                id: 2,
                date: "2026-09-04",
                mood: 5,
                note: "Просто гарний день",
              },
              { id: 3, date: "2026-09-03", mood: 3, note: "Багато працював" },
            ],
    };
  },
  computed: {
    average() {
      if (this.moodRecords.length === 0) return 0;
      const sum = this.moodRecords.reduce((acc, r) => acc + r.mood, 0);
      return sum / this.moodRecords.length;
    },
    summaryText() {
      const status = this.average >= 3.5 ? "гарний тиждень" : "важкий тиждень";
      return `Середній настрій: ${this.average.toFixed(1)} / 6 (${status})`;
    },
  },
  methods: {
    handleMoodUpdate({ id, newMood }) {
      const target = this.moodRecords.find((record) => record.id === id);
      if (target) {
        target.mood = newMood;
        saveToLocalStorage(this.moodRecords);
      }
    },
  },
}).mount("#app");

const MAX_CHARS = 200;
const API_URL = "https://jsonplaceholder.typicode.com/comments?postId=1";
const API_MOOD = 4;
const STORAGE_KEY = "moodEntries";
const DB_NAME = "MoodTrackerDB";
const STORE_NAME = "moodEntries";

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

  saveToLocalStorage(app.moodRecords);

  form.reset();
  if (charCounter) {
    charCounter.textContent = `Залишилось символів: ${MAX_CHARS}`;
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
      id: `api-${item.id}`,
      date: item.name,
      note: item.body,
      email: item.email,
      mood: API_MOOD,
      isApi: true,
    }));

    app.moodRecords.push(...adaptedRecords);
  } catch (error) {
    console.error("Не вдалося завантажити записи:", error);
    showError("Записи тимчасово недоступні");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadData);

loadData();

function saveToLocalStorage(items) {
  const userRecords = items.filter((item) => !item.isApi);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userRecords));
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Пошкоджені дані в localStorage:", error);
    return [];
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
