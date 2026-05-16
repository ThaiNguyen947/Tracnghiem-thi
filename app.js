let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60;

let stats = {}; // 🧠 hệ thống học thông minh

const app = document.getElementById("app");

// ================= USER LIST =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "user1", password: "123", role: "user" }
];

// ================= LOGIN UI =================
function showLogin() {
  document.getElementById("loginBox").innerHTML = `
    <div class="box" style="max-width:400px;text-align:center;margin-top:120px">
      <h2>Đăng nhập</h2>
      <input id="u" placeholder="Tài khoản" style="width:100%;padding:10px;margin:5px 0">
      <input id="p" type="password" placeholder="Mật khẩu" style="width:100%;padding:10px;margin:5px 0">
      <button onclick="login()" class="btn">Đăng nhập</button>
    </div>
  `;
}

// ================= LOGIN =================
function login() {
  let u = document.getElementById("u").value;
  let p = document.getElementById("p").value;

  let user = users.find(x => x.username === u && x.password === p);

  if (!user) return alert("Sai tài khoản");

  localStorage.setItem("user", JSON.stringify(user));

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";

  startExam();
}

// ================= CHECK LOGIN =================
function checkLogin() {
  let user = localStorage.getItem("user");

  if (!user) {
    showLogin();
  } else {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    startExam();
  }
}

// ================= LOAD DATA =================
fetch("cauhoi.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    checkLogin();
  });

// ================= SHUFFLE =================
function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ================= KEY =================
function getKey(q) {
  return (q.question || q.cauhoi || "").trim();
}

// ================= WEIGHT SYSTEM =================
function getWeight(q) {
  let key = getKey(q);
  let s = stats[key] || { wrong: 0, correct: 0 };
  return 1 + (s.wrong * 3) - (s.correct * 1);
}

function buildSmartPool() {
  let pool = [];

  for (let q of data) {
    let w = getWeight(q);
    for (let i = 0; i < w; i++) {
      pool.push(q);
    }
  }

  return shuffle(pool);
}

// ================= START EXAM =================
function startExam() {
  answers = {};
  index = 0;
  time = 60 * 60;

  let used = new Set();
  let list = [];

  // ưu tiên câu sai
  for (let q of wrongPool) {
    let key = getKey(q);
    if (!used.has(key)) {
      used.add(key);
      list.push(q);
    }
  }

  // pool thông minh
  let smartPool = buildSmartPool();

  for (let q of smartPool) {
    let key = getKey(q);

    if (!used.has(key)) {
      used.add(key);
      list.push(q);
    }

    if (list.length >= 100) break;
  }

  // bù đủ
  let remain = shuffle(data.filter(q => !used.has(getKey(q))));

  for (let q of remain) {
    if (list.length >= 100) break;
    list.push(q);
  }

  questions = shuffle(list).slice(0, 100);

  render();
  startTimer();
}

// ================= RENDER =================
function render() {
  let q = questions[index];
  let qText = q.question || q.cauhoi;
  let optA = q.a || q.Một || "";
  let optB = q.b || "";
  let optC = q.c || "";
  let optD = q.d || "";

  app.innerHTML = `
    <div class="box">
      <div class="top">
        <div>Câu: ${index + 1}/${questions.length}</div>
        <div>⏱ <span id="time"></span></div>
      </div>

      <div class="bar">
        <div class="bar-fill" id="bar"></div>
      </div>

      <h2>${qText}</h2>

      <button class="option" onclick="choose('A')">A. ${optA}</button>
      <button class="option" onclick="choose('B')">B. ${optB}</button>
      <button class="option" onclick="choose('C')">C. ${optC}</button>
      <button class="option" onclick="choose('D')">D. ${optD}</button>

      <div class="nav-control">
        <button class="nav-btn" onclick="prev()">← Trước</button>
        <button class="nav-btn" onclick="next()">Sau →</button>
      </div>

      <button class="btn" onclick="submit()">NỘP BÀI</button>

      <div id="nav"></div>
    </div>
  `;

  highlight();
  updateBar();
  renderNav();
}

// ================= CHỌN =================
function choose(c) {
  answers[index] = c;
  highlight();
}

// ================= HIGHLIGHT =================
function highlight() {
  setTimeout(() => {
    document.querySelectorAll(".option")
      .forEach(b => b.classList.remove("selected"));

    let ans = answers[index];
    if (!ans) return;

    const map = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
    let btns = document.querySelectorAll(".option");

    if (btns[map[ans]]) btns[map[ans]].classList.add("selected");
  }, 0);
}

// ================= NAV =================
function renderNav() {
  let nav = document.getElementById("nav");
  nav.innerHTML = "";

  questions.forEach((_, i) => {
    let btn = document.createElement("button");
    btn.innerText = i + 1;

    if (answers[i]) {
      btn.style.background = "#b30000";
      btn.style.color = "white";
    }

    btn.onclick = () => {
      index = i;
      render();
    };

    nav.appendChild(btn);
  });
}

// ================= NEXT / PREV =================
function next() {
  if (index < questions.length - 1) {
    index++;
    render();
  }
}

function prev() {
  if (index > 0) {
    index--;
    render();
  }
}

// ================= BAR =================
function updateBar() {
  let bar = document.getElementById("bar");
  if (bar) bar.style.width = ((index + 1) / questions.length) * 100 + "%";
}

// ================= TIMER =================
function startTimer() {
  clearInterval(timer);

  timer = setInterval(() => {
    time--;

    let m = Math.floor(time / 60);
    let s = time % 60;

    let el = document.getElementById("time");
    if (el) el.innerText = `${m}:${s < 10 ? "0" + s : s}`;

    if (time <= 0) submit();

  }, 1000);
}

// ================= SUBMIT =================
function submit() {
  clearInterval(timer);

  let correct = 0;
  let wrong = 0;
  let newWrong = [];

  questions.forEach((q, i) => {
    let key = getKey(q);

    if (!stats[key]) {
      stats[key] = { wrong: 0, correct: 0 };
    }

    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = (q.answer || q.trảlời || "").toString().trim().toLowerCase();
    if (correctAns === "một") correctAns = "a";

    if (userAns === correctAns) {
      correct++;
      stats[key].correct++;
    } else {
      wrong++;
      stats[key].wrong++;
      newWrong.push(q);
    }
  });

  wrongPool = [...new Map(newWrong.map(q => [getKey(q), q])).values()];

  document.body.style.backgroundColor = "#f4f5f7";

  app.innerHTML = `
    <div style="max-width:820px;margin:0 auto;background:#fff;padding:40px 50px;">
      <h1 style="text-align:center;">KẾT QUẢ</h1>
      <p style="text-align:center;">
        Đúng: ${correct} | Sai: ${wrong}
      </p>
      <button onclick="location.reload()">THI LẠI</button>
      <div id="result-list"></div>
    </div>
  `;

  filterResult('all');
}

// ================= FILTER RESULT =================
function filterResult(type) {
  let listContainer = document.getElementById("result-list");
  if (!listContainer) return;

  let html = "";

  questions.forEach((q, i) => {
    let userAns = answers[i] ? answers[i].toLowerCase() : "";
    let correctAns = (q.answer || q.trảlời || "").toLowerCase();
    if (correctAns === "một") correctAns = "a";

    let ok = userAns === correctAns;

    if (type === 'correct' && !ok) return;
    if (type === 'wrong' && ok) return;

    html += `<p><b>Câu ${i + 1}:</b> ${q.question || q.cauhoi}</p>`;
  });

  listContainer.innerHTML = html;
}
