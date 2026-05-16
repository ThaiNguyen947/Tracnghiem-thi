let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60;

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

// ================= SMART SHUFFLE (KHÔNG TRÙNG NHÓM LIỀN NHAU) =================
function smartShuffleNoRepeat(arr) {
  let a = shuffle(arr);

  let result = [];
  let lastGroup = null;

  while (a.length > 0) {
    let indexToPick = -1;

    for (let i = 0; i < a.length; i++) {
      let g = a[i].group || a[i].topic || "default";

      if (g !== lastGroup) {
        indexToPick = i;
        break;
      }
    }

    if (indexToPick === -1) {
      indexToPick = 0;
    }

    let picked = a.splice(indexToPick, 1)[0];

    lastGroup = picked.group || picked.topic || "default";

    result.push(picked);
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

  // ưu tiên câu sai
  for (let q of wrongPool) {
    let qText = q.question || q.cauhoi;
    if (!used.has(qText)) {
      used.add(qText);
      list.push(q);
    }
  }

  // lấy từ ngân hàng đề
  for (let q of data) {
    let qText = q.question || q.cauhoi;

    if (!used.has(qText)) {
      used.add(qText);
      list.push(q);
    }

    if (list.length >= 100) break;
  }

  // bổ sung nếu thiếu
  let remain = shuffle(data.filter(q => !used.has(q.question || q.cauhoi)));

  for (let q of remain) {
    if (list.length >= 100) break;
    list.push(q);
  }

  // 🔥 XÁO ĐỀ THÔNG MINH
  questions = smartShuffleNoRepeat(list).slice(0, 100);

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
    document.querySelectorAll(".option").forEach(b => b.classList.remove("selected"));

    let ans = answers[index];
    if (!ans) return;

    const map = { A: 0, B: 1, C: 2, D: 3 };
    let btns = document.querySelectorAll(".option");

    if (btns[map[ans]]) {
      btns[map[ans]].classList.add("selected");
    }
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
  if (bar) {
    bar.style.width = ((index + 1) / questions.length) * 100 + "%";
  }
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
    let userAns = answers[i] ? answers[i].toLowerCase() : "";
    let correctAns = (q.answer || q.trảlời || "").toLowerCase();

    if (correctAns === "một") correctAns = "a";

    if (userAns === correctAns) {
      correct++;
    } else {
      wrong++;
      newWrong.push(q);
    }
  });

  wrongPool = newWrong;

  document.body.style.backgroundColor = "#f4f5f7";

  app.innerHTML = `
    <div style="max-width:820px;margin:0 auto;background:#fff;padding:40px">
      <h1 style="text-align:center">KẾT QUẢ</h1>
      <p style="text-align:center">
        Đúng: <b style="color:green">${correct}</b> |
        Sai: <b style="color:red">${wrong}</b>
      </p>

      <div style="text-align:center">
        <button onclick="location.reload()">Làm lại</button>
      </div>
    </div>
  `;
}
