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
      <div class="card-header">
        <h3>{{ date }}</h3>
        <span class="card-emoji" title="Натисніть, щоб змінити настрій" @click.stop="promoteMood">{{ emoji }}</span>
      </div>
      <small v-if="email" class="card-email">{{ email }}</small>
      <p>{{ note }}</p>
      <a :href="'#/entry/' + id" data-link class="card-details-link">Детальніше →</a>
    </article>
  `,
};

const MAX_CHARS = 200;
const API_URL = "https://jsonplaceholder.typicode.com/comments?postId=1";
const API_MOOD = 4;
const STORAGE_KEY = "moodEntries";
const DB_NAME = "MoodTrackerDB";
const STORE_NAME = "moodEntries";
const MAX_CHART_RECORDS = 7;

const app = Vue.createApp({
  components: {
    MoodEntry,
  },
  data() {
    return {
      moodRecords: [],
      animationId: null,
      animProgress: 0,
      hoveredPoint: null,
      renderedPoints: [],
    };
  },
  computed: {
    recentUserRecords() {
      return this.moodRecords.filter((r) => !r.isApi).slice(-MAX_CHART_RECORDS);
    },
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
  watch: {
    recentUserRecords: {
      handler() {
        this.startChartAnimation();
      },
      deep: true,
    },
  },
  methods: {
    async handleMoodUpdate({ id, newMood }) {
      const target = this.moodRecords.find((record) => record.id === id);
      if (target) {
        target.mood = newMood;
        if (!target.isApi) {
          const recordToSave = { ...target };
          await addItem(recordToSave);
          const dbRecords = await getAllItems();
          const apiRecords = this.moodRecords.filter((r) => r.isApi);
          this.moodRecords = [...dbRecords, ...apiRecords];
        }
      }
    },

    // Запуск циклу анімації
    startChartAnimation() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      this.animProgress = 0;

      const animate = () => {
        this.animProgress += 0.035;
        if (this.animProgress > 1) this.animProgress = 1;

        this.drawChart(this.animProgress);

        if (this.animProgress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          this.animationId = null; // Анімація завершена
        }
      };

      this.animationId = requestAnimationFrame(animate);
    },

    // побудова графіка на основі масиву об'єктів настрою
    drawChart(progress = 1) {
      const canvas = document.querySelector("#chart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      const w = canvas.width;
      const h = canvas.height;
      const padLeft = 28;
      const padRight = 16;
      const padTop = 18;
      const padBottom = 24;

      ctx.clearRect(0, 0, w, h);
      ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      for (let level = 1; level <= 6; level++) {
        const y = padTop + ((6 - level) / 5) * (h - padTop - padBottom);
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = "#6b7280";
        ctx.fillText(level, padLeft - 8, y);
      }

      const records = this.recentUserRecords;
      if (records.length === 0) {
        this.renderedPoints = [];
        ctx.fillStyle = "#6b7280";
        ctx.font = "500 20px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Додайте запис настрою", w / 2, h / 2);
        return;
      }

      const chartW = w - padLeft - padRight;
      const chartH = h - padTop - padBottom;

      // розрахунок координат для кожної точки
      const points = records.map((rec, i) => {
        const x =
          records.length === 1
            ? padLeft + chartW / 2
            : padLeft + (i / (records.length - 1)) * chartW;
        const y = padTop + ((6 - rec.mood) / 5) * chartH;
        return { x, y, mood: rec.mood, date: rec.date.slice(5) };
      });
      this.renderedPoints = points;

      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();

      if (points.length === 1) {
        ctx.moveTo(points[0].x, points[0].y);
      } else {
        const totalSegments = points.length - 1;
        const currentPos = progress * totalSegments;
        const fullSegments = Math.floor(currentPos);
        const partial = currentPos - fullSegments;

        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < fullSegments; i++) {
          ctx.lineTo(points[i + 1].x, points[i + 1].y);
        }
        if (fullSegments < totalSegments) {
          const p1 = points[fullSegments];
          const p2 = points[fullSegments + 1];
          const interpX = p1.x + (p2.x - p1.x) * partial;
          const interpY = p1.y + (p2.y - p1.y) * partial;
          ctx.lineTo(interpX, interpY);
        }
      }
      ctx.stroke();

      const maxVisibleIndex =
        points.length === 1
          ? 0
          : Math.floor(progress * (points.length - 1) + 0.001);

      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (let i = 0; i <= maxVisibleIndex; i++) {
        const p = points[i];
        const isHovered = this.hoveredPoint === i;

        ctx.fillStyle = isHovered ? "#312e81" : "#4f46e5";
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 6.5 : 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#6b7280";
        ctx.fillText(p.date, p.x, h - padBottom + 6);

        // Виведення значення настрою при наведенні мишею
        if (isHovered) {
          ctx.font = "700 15px 'Plus Jakarta Sans', sans-serif";
          ctx.fillStyle = "#111827";
          ctx.textBaseline = "bottom";
          ctx.fillText(`${p.mood}/6`, p.x, p.y - 8);
          ctx.textBaseline = "top";
          ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
        }
      }
    },

    // Ввзаємодія з мишею під час наведення підсвічуємо точки
    setupCanvasHover() {
      const canvas = document.querySelector("#chart");
      if (!canvas) return;

      canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let foundIndex = null;
        this.renderedPoints.forEach((p, index) => {
          const dist = Math.hypot(mouseX - p.x, mouseY - p.y);
          if (dist <= 12) foundIndex = index;
        });

        if (this.hoveredPoint !== foundIndex) {
          this.hoveredPoint = foundIndex;
          canvas.style.cursor = foundIndex !== null ? "pointer" : "default";
          if (!this.animationId) {
            this.drawChart(1);
          }
        }
      });

      canvas.addEventListener("mouseleave", () => {
        if (this.hoveredPoint !== null) {
          this.hoveredPoint = null;
          canvas.style.cursor = "default";
          if (!this.animationId) {
            this.drawChart(1);
          }
        }
      });
    },
  },

  async mounted() {
    try {
      await migrateFromLocalStorage();
      this.moodRecords = await getAllItems();
      this.setupCanvasHover();
      this.startChartAnimation();
      await loadData();
    } catch (error) {
      console.error("Помилка при ініціалізації IndexedDB:", error);
      showError("Не вдалося відкрити базу даних IndexedDB.");
    }
  },

  beforeUnmount() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  },
}).mount("#app");

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
async function addMoodRecord(event) {
  event.preventDefault();
  validateMoodInput();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const currentMood = Number(inputMood.value);
  const currentDate = new Date().toLocaleDateString("sv-SE");
  const noteText = inputComment.value.trim();

  const newRecord = {
    date: currentDate,
    mood: currentMood,
    note: noteText,
  };

  await addItem(newRecord);

  const dbRecords = await getAllItems();
  const apiRecords = app.moodRecords.filter((r) => r.isApi);
  app.moodRecords = [...dbRecords, ...apiRecords];

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

// Відкриває базу даних або створює сховище moodEntries
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Додає новий або оновлює існуючий запис
async function addItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Зчитує всі записи з бази даних
async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Виконує перенесення даних із localStorage в IndexedDB
async function migrateFromLocalStorage() {
  if (localStorage.getItem("migrated") === "true") {
    return;
  }

  const existingInDB = await getAllItems();
  const localItems = loadFromLocalStorage();

  if (existingInDB.length === 0 && localItems.length > 0) {
    for (const item of localItems) {
      await addItem(item);
    }
    localStorage.setItem("migrated", "true");
  }
}
