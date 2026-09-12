const moodRecords = [
    { date: "2026-09-06", mood: 4 },
    { date: "2026-09-04", mood: 5 },
    { date: "2026-09-03", mood: 3 }
];

// Перетворює бал настрою у відповідний текстовий опиc
const moodToLabel = (mood) => {
  const labels = {
    1: "Дуже сумний",
    2: "Сумний",
    3: "Виснажений",
    4: "Спокійний",
    5: "Чудовий",
    6: "Неймовірний"
  };
  return labels[mood] || "Невідомий";
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
    console.log(`Кількість записів: ${moodRecords.length}`);
    console.log(`Сума балів: ${sum}`);
    const average_value = sum / moodRecords.length;

    return average_value;
}

// Виводить результат чи тиждень гарний чи важкий у консоль
function printResultsInConsol(average_value){
    console.log(`Середній настрій: ${average_value.toFixed(2)}`);
    if (average_value >= 3.5) {
    console.log("Підсумок: гарний тиждень");
    } else {
    console.log("Підсумок: важкий тиждень");
    }
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

  const currentMood = moodScores[selectedInput.value];
  const currentDate = new Date().toISOString().split("T")[0];

  moodRecords.push({
    date: currentDate,
    mood: currentMood
  });

  console.log(`\nДодано: ${currentDate}, настрій: ${currentMood} (${moodToLabel(currentMood)})`);
  printResultsInConsol(getMiddleValueOfMood());
}

console.log("Перевірка moodToLabel для 6:", moodToLabel(6));
console.log("Перевірка moodToLabel для 1:", moodToLabel(1));

document.querySelector("form")?.addEventListener("submit", addMoodRecord);

printResultsInConsol(getMiddleValueOfMood());