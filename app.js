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
  { username: "mainguyen", password: "123", role: "admin" },
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

// ================= START EXAM =================
function startExam() {
  answers = {};
  index = 0;
  time = 60 * 60;

  let used = new Set();
  let list = [];

  for (let q of wrongPool) {
    if (!used.has(q.question)) {
      used.add(q.question);
      list.push(q);
    }
  }

  for (let q of data) {
    if (!used.has(q.question)) {
      used.add(q.question);
      list.push(q);
    }
    if (list.length >= 100) break;
  }

  let remain = shuffle(data.filter(q => !used.has(q.question)));

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

  app.innerHTML = `
    <div class="box">
      <div class="top">
        <div>Câu: ${index + 1}/${questions.length}</div>
        <div>⏱ <span id="time"></span></div>
      </div>

      <div class="bar">
        <div class="bar-fill" id="bar"></div>
      </div>

      <h2>${q.question}</h2>

      <button class="option" onclick="choose('A')">A. ${q.a}</button>
      <button class="option" onclick="choose('B')">B. ${q.b}</button>
      <button class="option" onclick="choose('C')">C. ${q.c}</button>
      <button class="option" onclick="choose('D')">D. ${q.d}</button>

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
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = q.answer ? q.answer.toString().trim().toLowerCase() : "";
    
    if (userAns === correctAns) {
      correct++;
    } else {
      wrong++;
      newWrong.push(q);
    }
  });

  wrongPool = newWrong;

  app.innerHTML = `
    <div class="box">
      <h1>KẾT QUẢ</h1>
      <h2 style="margin: 5px 0;">✔ Đúng: ${correct} | ❌ Sai: ${wrong}</h2>

      <button class="btn" style="margin-bottom: 10px;" onclick="startExam()">THI LẠI</button>

      <div style="display: flex; gap: 6px; justify-content: center; margin-bottom: 5px;">
        <button class="nav-btn" style="background: #444; color: white; padding: 4px 10px; font-size: 13px;" onclick="filterResult('all')">Xem tất cả</button>
        <button class="nav-btn" style="background: green; color: white; padding: 4px 10px; font-size: 13px;" onclick="filterResult('correct')">Xem câu đúng</button>
        <button class="nav-btn" style="background: #b30000; color: white; padding: 4px 10px; font-size: 13px;" onclick="filterResult('wrong')">Xem câu sai</button>
      </div>

      <div id="result-list" style="text-align: left;">
        </div>
    </div>
  `;

  filterResult('all');
}

// ================= FILTER RESULT LIST =================
function filterResult(type) {
  let listContainer = document.getElementById("result-list");
  if (!listContainer) return;

  let html = "";

  questions.forEach((q, i) => {
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = q.answer ? q.answer.toString().trim().toLowerCase() : "";
    let ok = userAns === correctAns;

    if (type === 'correct' && !ok) return;
    if (type === 'wrong' && ok) return;

    // Hàm lấy nội dung text chi tiết của đáp án đúng
    let fullCorrectText = "Không rõ";
    if (correctAns === "a") fullCorrectText = `A. ${q.a}`;
    else if (correctAns === "b") fullCorrectText = `B. ${q.b}`;
    else if (correctAns === "c") fullCorrectText = `C. ${q.c}`;
    else if (correctAns === "d") fullCorrectText = `D. ${q.d}`;
    else if (q.answer) fullCorrectText = q.answer.toUpperCase();

    // Hàm lấy nội dung text chi tiết của đáp án người dùng chọn
    let fullUserText = "Không chọn";
    if (userAns === "a") fullUserText = `A. ${q.a}`;
    else if (userAns === "b") fullUserText = `B. ${q.b}`;
    else if (userAns === "c") fullUserText = `C. ${q.c}`;
    else if (userAns === "d") fullUserText = `D. ${q.d}`;

    html += `
      <div style="
        padding: 8px 4px;
        border-bottom: 1px solid #eee;
        white-space: pre-wrap;
        line-height: 1.4;
        font-family: Arial, sans-serif;
        font-size: 14px;
      ">
        <div style="margin-bottom: 2px;"><b>Câu ${i + 1}:</b> ${q.question}</div>
        
        <div style="margin-bottom: 2px;">
          <b>Bạn chọn:</b> <span style="color: ${ok ? 'green' : 'red'}; font-weight: bold;">${fullUserText}</span> 
          <span>${ok ? " | <b style='color:green;'>✔ ĐÚNG</b>" : " | <b style='color:red;'>❌ SAI</b>"}</span>
        </div>
        
        ${!ok ? `<div style="margin-bottom: 2px;"><b>Đáp án đúng:</b> <b style="color: green;">${fullCorrectText}</b></div>` : ""}

        <div style="
          margin-top: 4px;
          font-family: 'Times New Roman', serif;
          text-align: justify;
          font-size: 13.5px;
          color: #555;
          background: #fcfcfc;
          padding: 5px 8px;
          border-radius: 4px;
          border-left: 3px solid #ccc;
        ">
          💡 <b>Giải thích:</b> ${q.explanation ? q.explanation : (q.giảithích ? q.giảithích : "Chưa có giải thích")}
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html || "<p style='text-align:center; color:#777; padding: 15px; font-size:13px;'>Không tìm thấy câu hỏi tương ứng mục này.</p>";
}
