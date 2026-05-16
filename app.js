let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60;

const app = document.getElementById("app");

// ================= USER =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "user1", password: "123", role: "user" }
];

// ================= LOGIN =================
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

function checkLogin() {
  let user = localStorage.getItem("user");

  if (!user) showLogin();
  else {
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

    // init weight system
    data.forEach(q => {
      q.weight = q.weight || 1;
      q.correctCount = q.correctCount || 0;
      q.wrongCount = q.wrongCount || 0;
    });

    // restore memory
    let saved = localStorage.getItem("questionData");
    if (saved) {
      let savedData = JSON.parse(saved);

      data.forEach(q => {
        let s = savedData.find(x =>
          (x.question || x.cauhoi) === (q.question || q.cauhoi)
        );
        if (s) {
          q.weight = s.weight || 1;
          q.correctCount = s.correctCount || 0;
          q.wrongCount = s.wrongCount || 0;
        }
      });
    }

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

function smartShuffle(arr, groupSize = 3) {
  let groups = [];
  let result = [];

  for (let i = 0; i < arr.length; i += groupSize) {
    groups.push(arr.slice(i, i + groupSize));
  }

  groups = groups.map(g => shuffle(g));

  let maxLen = Math.max(...groups.map(g => g.length));

  for (let i = 0; i < maxLen; i++) {
    for (let g of groups) {
      if (g[i]) result.push(g[i]);
    }
  }

  return result;
}

// ================= WEIGHT PICK =================
function weightedPick(arr, count) {
  let pool = [...arr];
  let result = [];

  for (let i = 0; i < count; i++) {
    if (!pool.length) break;

    let total = pool.reduce((s, q) => s + (q.weight || 1), 0);
    let r = Math.random() * total;

    let sum = 0;

    for (let j = 0; j < pool.length; j++) {
      sum += (pool[j].weight || 1);

      if (r <= sum) {
        result.push(pool[j]);
        pool.splice(j, 1);
        break;
      }
    }
  }

  return result;
}

// ================= START EXAM =================
function startExam() {
  answers = {};
  index = 0;
  time = 60 * 60;

  let used = new Set();
  let list = [];

  // 1. ưu tiên câu sai
  for (let q of wrongPool) {
    let t = q.question || q.cauhoi;
    if (!used.has(t)) {
      used.add(t);
      list.push(q);
    }
  }

  // 2. thêm câu chưa dùng
  for (let q of data) {
    let t = q.question || q.cauhoi;
    if (!used.has(t)) {
      used.add(t);
      list.push(q);
    }
  }

  // 3. chống trùng hoàn toàn
  list = list.filter((q, i, arr) =>
    arr.findIndex(x => (x.question || x.cauhoi) === (q.question || q.cauhoi)) === i
  );

  // 4. shuffle + rải đều
  list = smartShuffle(list);

  // 5. chọn theo weight
  questions = weightedPick(list, 100);

  render();
  startTimer();
}

// ================= RENDER =================
function render() {
  let q = questions[index];
  let qText = q.question || q.cauhoi;

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

      <button class="option" onclick="choose('A')">A. ${q.a || ""}</button>
      <button class="option" onclick="choose('B')">B. ${q.b || ""}</button>
      <button class="option" onclick="choose('C')">C. ${q.c || ""}</button>
      <button class="option" onclick="choose('D')">D. ${q.d || ""}</button>

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

// ================= CHOOSE =================
function choose(c) {
  answers[index] = c;
  highlight();
}

function highlight() {
  setTimeout(() => {
    document.querySelectorAll(".option").forEach(b =>
      b.classList.remove("selected")
    );

    let ans = answers[index];
    if (!ans) return;

    const map = { A: 0, B: 1, C: 2, D: 3 };
    document.querySelectorAll(".option")[map[ans]].classList.add("selected");
  }, 0);
}

// ================= NAV =================
function renderNav() {
  let nav = document.getElementById("nav");
  nav.innerHTML = "";

  questions.forEach((_, i) => {
    let btn = document.createElement("button");
    btn.innerText = i + 1;

    if (answers[i]) btn.style.background = "#b30000";

    if (i === index) btn.style.border = "2px solid black";

    btn.onclick = () => {
      index = i;
      render();
    };

    nav.appendChild(btn);
  });
}

// ================= NEXT/PREV =================
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
    if (el) el.innerText = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

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
    let userAns = (answers[i] || "").toLowerCase().trim();

    let correctAns = (q.answer || q.trảlời || "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-d]/g, "");

    if (userAns === correctAns) {
      correct++;
      q.correctCount++;
      q.weight = Math.max(1, q.weight - 0.3);
    } else {
      wrong++;
      q.wrongCount++;
      q.weight = Math.min(10, q.weight + 1.2);
      newWrong.push(q);
    }
  });

  wrongPool = newWrong;

  localStorage.setItem("questionData", JSON.stringify(data));

  app.innerHTML = `
    <div class="box">
      <h1>Kết quả</h1>
      <p>Đúng: ${correct} | Sai: ${wrong}</p>
      <button onclick="location.reload()">Thi lại</button>
    </div>
  `;
} viết lại toàn bộ vào đây, k xóa bớt, k lược bỏ gì hết
