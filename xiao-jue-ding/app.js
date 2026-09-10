// 今日小决定：填写 2～6 个选项，随机选出一个。
// 上次填写的内容会保存在浏览器的 localStorage 里。

const STORAGE_KEY = "xiao-jue-ding-options";
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const DEFAULT_OPTIONS = ["咖啡", "茶", "走路"];

const form = document.getElementById("options-form");
const addBtn = document.getElementById("add-btn");
const removeBtn = document.getElementById("remove-btn");
const pickBtn = document.getElementById("pick-btn");
const message = document.getElementById("message");

let optionCount = DEFAULT_OPTIONS.length;
let isPicking = false;

function loadSavedOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length >= MIN_OPTIONS && parsed.length <= MAX_OPTIONS) {
      return parsed.map((item) => String(item));
    }
  } catch (error) {
    // 本地数据坏了就退回默认选项，不影响使用
  }
  return DEFAULT_OPTIONS.slice();
}

function saveOptions() {
  const values = [...form.querySelectorAll("input")].map((input) => input.value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

function filledOptions() {
  return [...form.querySelectorAll("input")]
    .map((input) => input.value.trim())
    .filter((value) => value !== "");
}

function setMessage(text, kind) {
  message.textContent = text;
  message.className = "message" + (kind ? " " + kind : "");
}

function renderInputs(values) {
  optionCount = values.length;
  form.innerHTML = "";

  values.forEach((value, index) => {
    const row = document.createElement("label");
    row.className = "option";

    const mark = document.createElement("span");
    mark.textContent = index + 1;

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 24;
    input.placeholder = "写一个选项，比如：咖啡";
    input.value = value;
    input.addEventListener("input", () => {
      saveOptions();
      clearHighlights();
    });

    row.append(mark, input);
    form.append(row);
  });

  addBtn.disabled = optionCount >= MAX_OPTIONS;
  removeBtn.disabled = optionCount <= MIN_OPTIONS;
}

function currentValues() {
  const values = [...form.querySelectorAll("input")].map((input) => input.value);
  while (values.length < optionCount) values.push("");
  return values.slice(0, optionCount);
}

function clearHighlights() {
  form.querySelectorAll(".option").forEach((row) => {
    row.classList.remove("spinning", "winner");
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 先在已填写的选项上快速轮流高亮，再停在最终选项上。
async function playPickAnimation(winnerIndex) {
  const rows = [...form.querySelectorAll(".option")];
  const usableIndexes = rows
    .map((row, index) => (row.querySelector("input").value.trim() ? index : -1))
    .filter((index) => index !== -1);

  for (let step = 0; step < 12; step += 1) {
    const current = rows[usableIndexes[step % usableIndexes.length]];
    clearHighlights();
    current.classList.add("spinning");
    await wait(70 + step * 14);
  }

  clearHighlights();
  rows[winnerIndex].classList.add("winner");
}

async function pickOne() {
  if (isPicking) return;

  const choices = filledOptions();
  if (choices.length < MIN_OPTIONS) {
    setMessage("至少先写下两个选项哦。", "error");
    return;
  }

  // 只在已填写的选项里抽，空格子不参与。
  const inputs = [...form.querySelectorAll("input")];
  const usableIndexes = inputs
    .map((input, index) => (input.value.trim() ? index : -1))
    .filter((index) => index !== -1);

  const winnerIndex = usableIndexes[Math.floor(Math.random() * usableIndexes.length)];
  const winnerText = inputs[winnerIndex].value.trim();

  isPicking = true;
  pickBtn.disabled = true;
  addBtn.disabled = true;
  removeBtn.disabled = true;
  setMessage("让我想想……", "");

  await playPickAnimation(winnerIndex);

  setMessage("今天就选这个吧：" + winnerText + " ✨", "ok");
  isPicking = false;
  pickBtn.disabled = false;
  addBtn.disabled = optionCount >= MAX_OPTIONS;
  removeBtn.disabled = optionCount <= MIN_OPTIONS;
  saveOptions();
}

addBtn.addEventListener("click", () => {
  if (optionCount >= MAX_OPTIONS) return;
  const values = currentValues();
  values.push("");
  renderInputs(values);
  saveOptions();
  const inputs = form.querySelectorAll("input");
  inputs[inputs.length - 1].focus();
});

removeBtn.addEventListener("click", () => {
  if (optionCount <= MIN_OPTIONS) return;
  const values = currentValues().slice(0, -1);
  renderInputs(values);
  saveOptions();
  clearHighlights();
});

pickBtn.addEventListener("click", pickOne);

renderInputs(loadSavedOptions());
