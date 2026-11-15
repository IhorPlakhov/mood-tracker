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
      currentView: "home",
      selectedEntry: null,
      draftMood: "",
      draftComment: "",
      isDataInitialized: false,
      isLoading: false,
      errorMessage: "",
      moodRecords: [],
      animationId: null,
      animProgress: 0,
      hoveredPoint: null,
      renderedPoints: [],
    };
  },
  computed: {
    remainingChars() {
      return MAX_CHARS - this.draftComment.length;
    },
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
        if (this.currentView === "stats") {
          this.startChartAnimation();
        }
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

    getEmoji(mood) {
      const emojiMap = { 1: "😭", 2: "🙁", 3: "🥱", 4: "😐", 5: "😊", 6: "🤩" };
      return emojiMap[mood] || "😐";
    },

    async ensureDataLoaded() {
      if (this.isDataInitialized) return;
      try {
        await migrateFromLocalStorage();
        this.moodRecords = await getAllItems();
        await this.loadApiData();
        this.isDataInitialized = true;
      } catch (error) {
        console.error("Помилка при ініціалізації IndexedDB:", error);
        this.errorMessage = "Не вдалося відкрити базу даних IndexedDB.";
      }
    },

    async loadApiData() {
      this.errorMessage = "";
      this.isLoading = true;
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Код ${response.status}`);
        const data = await response.json();

        const adaptedRecords = data.map((item) => ({
          id: `api-${item.id}`,
          date: item.name,
          note: item.body,
          email: item.email,
          mood: API_MOOD,
          isApi: true,
        }));

        const userRecords = this.moodRecords.filter((r) => !r.isApi);
        this.moodRecords = [...userRecords, ...adaptedRecords];
      } catch (error) {
        this.errorMessage = "Записи тимчасово недоступні";
      } finally {
        this.isLoading = false;
      }
    },

    async addMoodRecord(event) {
      const form = event.target;
      const inputMood = form.querySelector("#mood-value");
      const inputComment = form.querySelector("#mood-comment");

      const rawMood = String(this.draftMood).trim();
      const moodNum = Number(rawMood);

      if (rawMood === "") {
        inputMood.setCustomValidity("Введіть оцінку настрою від 1 до 6.");
      } else if (!Number.isInteger(moodNum)) {
        inputMood.setCustomValidity("Настрій має бути цілим числом.");
      } else if (moodNum < 1 || moodNum > 6) {
        inputMood.setCustomValidity("Настрій має бути в діапазоні від 1 до 6.");
      } else {
        inputMood.setCustomValidity("");
      }

      if (
        this.draftComment.length > 0 &&
        this.draftComment.trim().length === 0
      ) {
        inputComment.setCustomValidity(
          "Нотатка не може складатися лише з пробілів.",
        );
      } else {
        inputComment.setCustomValidity("");
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      await addItem({
        date: new Date().toLocaleDateString("sv-SE"),
        mood: moodNum,
        note: this.draftComment.trim(),
      });

      const dbRecords = await getAllItems();
      const apiRecords = this.moodRecords.filter((r) => r.isApi);
      this.moodRecords = [...dbRecords, ...apiRecords];

      this.draftMood = "";
      this.draftComment = "";
    },
  },

  beforeUnmount() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  },
}).mount("#app");

// функції для кожного маршруту
async function renderHomeView() {
  app.selectedEntry = null;
  app.currentView = "home";
  await app.ensureDataLoaded();
}

async function renderHistoryView() {
  app.selectedEntry = null;
  app.currentView = "history";
  await app.ensureDataLoaded();
}

async function renderStatsView() {
  app.selectedEntry = null;
  app.currentView = "stats";
  await app.ensureDataLoaded();

  app.$nextTick(() => {
    app.setupCanvasHover();
    app.startChartAnimation();
  });
}

// сторінка деталей запису за :id
async function renderEntryDetailsView(params) {
  app.selectedEntry = null;
  app.currentView = "details";
  await app.ensureDataLoaded();

  const found = app.moodRecords.find(
    (item) => String(item.id) === String(params.id),
  );
  app.selectedEntry = found || null;
}

// неіснуючий маршрут 404
function renderNotFoundView() {
  app.selectedEntry = null;
  app.currentView = "not-found";
}

// таблиця маршрутів
const routes = [
  { path: "/", view: renderHomeView },
  { path: "/history", view: renderHistoryView },
  { path: "/stats", view: renderStatsView },
  { path: "/entry/:id", view: renderEntryDetailsView },
];

// зіставлення шляху з патернами та витяг параметрів
function matchRoute(path) {
  const cleanPath = path.replace(/\/+$/, "") || "/";
  const pathParts = cleanPath.split("/").filter(Boolean);

  for (const route of routes) {
    const routeParts = route.path.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    let isMatch = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) {
        const paramName = routeParts[i].slice(1);
        params[paramName] = decodeURIComponent(pathParts[i]);
      } else if (routeParts[i] !== pathParts[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return { route, params };
    }
  }

  return null;
}

// зміна хеша для перемикання активного розділу
function navigate(path) {
  const normalizedPath = path.startsWith("#") ? path.slice(1) : path;
  location.hash = `#${normalizedPath}`;
}

// підсвітка активного пункту меню
function updateActiveNavLink(currentPath) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const linkRoute = link.getAttribute("data-route");
    link.classList.toggle("active", linkRoute === currentPath);
  });
}

// функція рендеру при зміні хеша або завантаженні
async function render() {
  const path = location.hash.slice(1) || "/";
  updateActiveNavLink(path);

  const matched = matchRoute(path);
  if (matched) {
    await matched.route.view(matched.params);
  } else {
    renderNotFoundView();
  }
}

// обробка кліків по внутрішніх посиланнях
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-link]");
  if (!link) return;

  e.preventDefault();
  const href = link.getAttribute("href");
  if (href) {
    navigate(href);
  }
});

// відстеження змін адреси після # та початкового запуску
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

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
