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
    if (!used.has(q.question || q.cauhoi)) {
      used.add(q.question || q.cauhoi);
      list.push(q);
    }
  }

  for (let q of data) {
    let qText = q.question || q.cauhoi;
    if (!used.has(qText)) {
      used.add(qText);
      list.push(q);
    }
    if (list.length >= 100) break;
  }

  let remain = shuffle(data.filter(q => !used.has(q.question || q.cauhoi)));

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
    let correctAns = (q.answer || q.trảlời || "").toString().trim().toLowerCase();
    
    // Đồng nhất đáp án 'một' thành 'a' để khớp với logic làm bài
    if (correctAns === "một") correctAns = "a";

    if (userAns === correctAns) {
      correct++;
    } else {
      wrong++;
      newWrong.push(q);
    }
  });

  wrongPool = newWrong;

  app.innerHTML = `
    <div class="box" style="padding: 10px; max-width: 100%;">
      <h1 style="font-size: 20px; margin: 5px 0; text-align: center;">KẾT QUẢ</h1>
      <h3 style="margin: 5px 0; font-size: 15px; text-align: center;">✔ Đúng: ${correct} | ❌ Sai: ${wrong}</h3>

      <div style="text-align: center;">
        <button class="btn" style="margin: 5px 0; padding: 6px 20px; font-size: 13px;" onclick="startExam()">THI LẠI</button>
      </div>

      <div style="display: flex; gap: 5px; justify-content: center; margin: 8px 0 12px 0;">
        <button class="nav-btn" style="background: #444; color: white; padding: 4px 10px; font-size: 12px;" onclick="filterResult('all')">Xem tất cả</button>
        <button class="nav-btn" style="background: green; color: white; padding: 4px 10px; font-size: 12px;" onclick="filterResult('correct')">Xem câu đúng</button>
        <button class="nav-btn" style="background: #b30000; color: white; padding: 4px 10px; font-size: 12px;" onclick="filterResult('wrong')">Xem câu sai</button>
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
  let displayIndex = 0; 

  questions.forEach((q, i) => {
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = (q.answer || q.trảlời || "").toString().trim().toLowerCase();
    if (correctAns === "một") correctAns = "a";
    
    let ok = userAns === correctAns;

    if (type === 'correct' && !ok) return;
    if (type === 'wrong' && ok) return;

    displayIndex++;
    // Tạo nền xám trắng xen kẽ cực kỳ thanh mảnh giúp phân biệt các câu
    let bgColor = (displayIndex % 2 === 0) ? "#fcfcfc" : "#ffffff";

    let qText = q.question || q.cauhoi;
    let optA = q.a || q.Một || "";
    let optB = q.b || "";
    let optC = q.c || "";
    let optD = q.d || "";

    // Trích xuất văn bản đáp án đúng đầy đủ văn cảnh để tránh chữ "Không hợp lệ"
    let fullCorrectText = "";
    if (correctAns === "a") fullCorrectText = `A. ${optA}`;
    else if (correctAns === "b") fullCorrectText = `B. ${optB}`;
    else if (correctAns === "c") fullCorrectText = `C. ${optC}`;
    else if (correctAns === "d") fullCorrectText = `D. ${optD}`;
    else fullCorrectText = (q.answer || q.trảlời || "Chưa rõ").toUpperCase();

    // Trích xuất văn bản đáp án người dùng đã chọn
    let fullUserText = "Không chọn";
    if (userAns === "a") fullUserText = `A. ${optA}`;
    else if (userAns === "b") fullUserText = `B. ${optB}`;
    else if (userAns === "c") fullUserText = `C. ${optC}`;
    else if (userAns === "d") fullUserText = `D. ${optD}`;

    html += `
      <div style="
        padding: 6px 8px;
        background-color: ${bgColor};
        border-bottom: 1px solid #eee;
        white-space: pre-wrap;
        line-height: 0.9;
        font-family: Arial, sans-serif;
        font-size: 14px;
      ">
        <p style="margin: 0 0 2px 0; padding: 0;"><b>Câu ${i + 1}:</b> ${qText}</p>
        
        <p style="margin: 0 0 2px 0; padding: 0;">
          <b>Bạn chọn:</b> ${fullUserText} | 
          <span style="color: ${ok ? 'green' : 'red'}; font-weight: bold;">${ok ? "✔ ĐÚNG" : "❌ SAI"}</span>
          ${!ok ? ` | <b>Đáp án đúng:</b> <span style="color: green; font-weight: bold;">${fullCorrectText}</span>` : ""}
        </p>

        <p style="
          margin: 3px 0 0 0; 
          padding: 2px 0 2px 8px;
          font-family: 'Times New Roman', serif;
          text-align: justify;
          font-size: 13.5px;
          color: #444;
          background: #fafafa;
          border-left: 2px solid #ccc;
        ">
          💡 <b>Giải thích:</b> ${q.explanation ? q.explanation : (q.giảithích ? q.giảithích : "Chưa có giải thích")}
        </p>
      </div>
    `;
  });

  listContainer.innerHTML = html || "<p style='text-align:center; color:#777; padding: 10px; font-size:12px;'>Không có dữ liệu hiển thị.</p>";
}
