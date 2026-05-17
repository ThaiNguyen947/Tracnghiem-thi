let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60;
let currentFilter = 'all'; 

const app = document.getElementById("app");
function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}
// ================= USER LIST =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "huyen@", password: "1112233", role: "user" }
];
let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

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

  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  if (user.role !== "admin") {
    if (sessions[user.username] && sessions[user.username] !== deviceId) {
      alert("Tài khoản đã đăng nhập trên thiết bị khác!");
      return;
    }
  }

  sessions[user.username] = deviceId;
  localStorage.setItem("loginSessions", JSON.stringify(sessions));
  localStorage.setItem("user", JSON.stringify(user));

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";
  
  enableProtectionForSubAccounts();
  startExam();
}

// ================= CHECK LOGIN =================
function checkLogin() {
  let user = JSON.parse(localStorage.getItem("user"));
  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  if (!user) {
    showLogin();
    return;
  }

  if (user.role !== "admin") {
    if (sessions[user.username] !== deviceId) {
      alert("Phiên đăng nhập không hợp lệ (thiết bị khác đã đăng nhập)");
      localStorage.removeItem("user");
      showLogin();
      return;
    }
  }

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";
  enableProtectionForSubAccounts();
  startExam();
}

// ================= LOAD MULTIPLE JSON FILES (ĐÃ THÊM ĐOẠN KIỂM TRA FILE) =================
async function taiTatCaDuLieuCauHoi() {
  const danhSachFiles = [
    "./cau_hoi/p1.json",
    "./cau_hoi/p2.json",
    "./cau_hoi/p3.json",
    "./cau_hoi/p4.json"
  ];
  
  let beCauHoiTong = [];

  console.log("=== BẮT ĐẦU KIỂM TRA TẢI FILE JSON ===");
  for (const duongDan of danhSachFiles) {
    try {
      const res = await fetch(duongDan);
      if (!res.ok) throw new Error();
      const json = await res.json();
      console.log(`✓ Tải thành công file: ${duongDan} | Số lượng câu: ${json.length}`);
      beCauHoiTong = beCauHoiTong.concat(json);
    } catch (err) {
      console.error(`❌ LỖI TẢI FILE HOẶC SAI CẤU TRÚC JSON tại đường dẫn: ${duongDan}`);
    }
  }

  console.log(`➡️ TỔNG SỐ CÂU HỎI THỰC TẾ LOAD ĐƯỢC: ${beCauHoiTong.length} câu.`);
  console.log("======================================");

  if (beCauHoiTong.length === 0) {
    return [];
  }

  beCauHoiTong.forEach(q => {
    q.weight = q.weight || 1;
    q.correctCount = q.correctCount || 0;
    q.wrongCount = q.wrongCount || 0;
  });

  return beCauHoiTong;
}

// ================= KHI KHỞI ĐỘNG ỨNG DỤNG =================
async function khoiDongUngDung() {
  const fileData = await taiTatCaDuLieuCauHoi();
  
  if (fileData.length === 0) {
    const localData = localStorage.getItem("questionData");
    if (localData) {
      data = JSON.parse(localData);
      checkLogin();
    } else {
      alert("Không tải được bất kỳ file câu hỏi nào trong thư mục cau_hoi! Vui lòng kiểm tra lại đường dẫn.");
    }
    return;
  }

  const localData = localStorage.getItem("questionData");
  if (localData) {
    const localQuestions = JSON.parse(localData);
    const localMap = new Map();
    localQuestions.forEach(q => {
      let qText = (q.question || q.cauhoi || "").trim();
      if (qText) localMap.set(qText, q);
    });

    fileData.forEach(q => {
      let qText = (q.question || q.cauhoi || "").trim();
      if (localMap.has(qText)) {
        const oldQ = localMap.get(qText);
        q.weight = oldQ.weight || 1;
        q.correctCount = oldQ.correctCount || 0;
        q.wrongCount = oldQ.wrongCount || 0;
      }
    });
  }

  data = fileData;
  localStorage.setItem("questionData", JSON.stringify(data));
  checkLogin();
}

khoiDongUngDung();


// ================= SHUFFLE THUẬT TOÁN ĐỔI CHỖ LỘN XỘN TỐI ĐA =================
function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ================= START EXAM (ĐÃ THÊM LOG KIỂM TRA BỐC ĐỀ) =================
function startExam() {
  answers = {};
  index = 0;
  time = 60 * 60;

  let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");
  let randomWholeData = shuffle(data);

  // LOGIC: Lấy (Câu sai + Toàn bộ đề) - Loại bỏ hoàn toàn những câu nằm trong correctPool
  let poolKhaDung = randomWholeData.filter(q => {
    let qText = (q.question || q.cauhoi || "").trim();
    return !correctPool.includes(qText);
  });

  console.log("=== KIỂM TRA LOGIC TRỘN ĐỀ ===");
  console.log(`- Số câu đã làm ĐÚNG hoàn toàn (bị ẩn đi): ${correctPool.length}`);
  console.log(`- Số câu KHẢ DỤNG còn lại có thể bốc: ${poolKhaDung.length}`);

  // Tách pool khả dụng làm 2 nhóm để ưu tiên đưa câu từng sai lên trước
  let wrongQuestions = poolKhaDung.filter(q => (q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0));
  let remainingQuestions = poolKhaDung.filter(q => !((q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0)));

  console.log(`  + Trong đó số câu từng LÀM SAI (được ưu tiên): ${wrongQuestions.length}`);
  console.log(`  + Trong đó số câu MỚI TINH / CHƯA LÀM: ${remainingQuestions.length}`);

  // Gom câu sai trước
  let list = wrongQuestions.slice(0, 100);

  // Nếu câu sai chưa đủ 100 ➡️ Bốc bù từ nhóm câu chưa làm/chưa đúng
  if (list.length < 100) {
    for (let q of remainingQuestions) {
      if (list.length >= 100) break;
      list.push(q);
    }
  }

  // Trường hợp đặc biệt: Nếu học viên đã làm ĐÚNG SẠCH SẼ toàn bộ kho đề (Hết sạch câu khả dụng)
  if (list.length === 0 && data.length > 0) {
    console.log("🚨 KHO ĐỀ KHẢ DỤNG ĐÃ HẾT SẠCH! TỰ ĐỘNG RESET CORRECTPOOL ĐỂ CHẠY LẠI VÒNG MỚI.");
    alert("Chúc mừng! Bạn đã hoàn thành đúng toàn bộ câu hỏi. Hệ thống sẽ làm mới để bạn học lại từ đầu!");
    localStorage.removeItem("correctPool");
    data.forEach(q => { q.weight = 1; q.correctCount = 0; q.wrongCount = 0; });
    list = shuffle([...data]).slice(0, 100);
  }

  // TRỘN TỔNG LỰC LẦN CUỐI
  list = shuffle(list);

  // Lấy chuẩn xác tối đa 100 câu phân tán ngẫu nhiên không trùng lặp
  questions = list.filter(q => q && (q.question || q.cauhoi)).slice(0, Math.min(100, list.length));
  console.log(`=> ĐỀ THI ĐÃ CHỐT: Tạo đề thành công với ${questions.length} câu hỏi không trùng lặp.`);
  console.log("==============================");

  render();
  startTimer();
}

// ================= RENDER =================
function render() {
  if (questions.length === 0 || !questions[index]) {
    app.innerHTML = `<div class="box"><h2>Dữ liệu câu hỏi đang được cập nhật hoặc bị lỗi bộ nhớ!</h2></div>`;
    return;
  }

  let q = questions[index];
  let qText = q.question || q.cauhoi || "Nội dung câu hỏi không tồn tại";
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

      <h2 style="white-space: pre-wrap; text-align: justify;">${qText}</h2>

      <button class="option" onclick="choose('A')">A. ${optA}</button>
      <button class="option" onclick="choose('B')">B. ${optB}</button>
      <button class="option" onclick="choose('C')">C. ${optC}</button>
      <button class="option" onclick="choose('D')">D. ${optD}</button>

      <div class="nav-control">
        <button class="nav-btn" onclick="prev()">← Trước</button>
        <button class="nav-btn" onclick="next()">Sau →</button>
      </div>

      <button class="btn" style="margin-top:15px; background:#b30000; color:#fff;" onclick="submit()">NỘP BÀI</button>

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
  if (!nav) return;
  nav.innerHTML = "";

  questions.forEach((_, i) => {
    let btn = document.createElement("button");
    btn.innerText = i + 1;

    if (answers[i]) {
      btn.style.background = "#b30000";
      btn.style.color = "white";
    }

    if (i === index) {
      btn.style.border = "2px solid #000";
      btn.style.fontWeight = "bold";
    }

    btn.onclick = () => {
      index = i;
      render();
    };

    nav.appendChild(btn);
  });
}

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

function updateBar() {
  let bar = document.getElementById("bar");
  if (bar && questions.length > 0) {
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
  let submittedCount = 0; 
  let newWrong = [];

  let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

  questions.forEach((q, i) => {
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = (q.answer || q.trảlời || "").toString().trim().toLowerCase();

    if (correctAns === "một") correctAns = "a";

    let qTextId = (q.question || q.cauhoi || "").trim();
    let originalQ = data.find(x => (x.question || x.cauhoi || "").trim() === qTextId);
    
    if (!originalQ) originalQ = q; 

    originalQ.weight = originalQ.weight || 1;
    originalQ.correctCount = originalQ.correctCount || 0;
    originalQ.wrongCount = originalQ.wrongCount || 0;

    if (userAns !== "") {
      submittedCount++; 
      if (userAns === correctAns) {
        correct++;
        originalQ.correctCount++;
        originalQ.weight = Math.max(1, originalQ.weight - 0.3);
        
        if (!correctPool.includes(qTextId)) {
          correctPool.push(qTextId);
        }
      } else {
        wrong++;
        newWrong.push(originalQ);
        originalQ.wrongCount++;
        originalQ.weight = Math.min(10, originalQ.weight + 1.2); 
        
        let cIndex = correctPool.indexOf(qTextId);
        if (cIndex > -1) {
          correctPool.splice(cIndex, 1);
        }
      }
    } else {
      wrong++; 
    }
  });

  localStorage.setItem("correctPool", JSON.stringify(correctPool));
  localStorage.setItem("questionData", JSON.stringify(data)); 
  wrongPool = newWrong;

  document.body.style.backgroundColor = "#f4f5f7";
  document.body.style.margin = "0";
  document.body.style.padding = "20px 0";

  app.innerHTML = `
    <div style="
      max-width: 820px; 
      margin: 0 auto; 
      background: #ffffff; 
      padding: 40px 50px; 
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
      border-radius: 8px;
      font-family: 'Times New Roman', Times, serif;
    ">
      <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 10px 0; color: #111; letter-spacing: 0.5px;">BÁO CÁO KẾT QUẢ KIỂM TRA</h1>
      
      <p style="text-align: center; font-size: 15px; color: #555; margin: 0 0 20px 0; line-height: 1.6;">
        Số câu đã làm: <b style="color: #00796b; font-size: 16px;">${submittedCount}/${questions.length}</b><br>
        Số câu đúng: <b style="color: #2e7d32; font-size: 16px;">${correct}</b> | Chưa hoàn thành/Sai: <b style="color: #c62828; font-size: 16px;">${wrong}</b>
      </p>

      <div style="text-align: center; margin-bottom: 25px;">
        <button class="btn" style="background: #00796b; color: white; border: none; padding: 10px 28px; font-size: 14px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 20px; font-weight: bold; transition: 0.2s; box-shadow: 0 2px 6px rgba(0,121,107,0.2);" onclick="location.reload()">THI LẠI TRANG CHỦ</button>
      </div>

      <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 25px; border-bottom: 1px solid #eef0f2; padding-bottom: 15px;">
        <button id="btn-filter-all" style="padding: 6px 16px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('all')">Tất cả câu hỏi</button>
        <button id="btn-filter-correct" style="padding: 6px 16px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('correct')">Các câu đúng</button>
        <button id="btn-filter-wrong" style="padding: 6px 16px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('wrong')">Các câu chưa làm / sai</button>
      </div>

      <div id="result-list"></div>
    </div>
  `;

  filterResult('all');
}

// ================= FILTER RESULT LIST =================
function filterResult(type) {
  currentFilter = type;
  let listContainer = document.getElementById("result-list");
  if (!listContainer) return;

  const btnAll = document.getElementById("btn-filter-all");
  const btnCorrect = document.getElementById("btn-filter-correct");
  const btnWrong = document.getElementById("btn-filter-wrong");

  if(btnAll && btnCorrect && btnWrong) {
    btnAll.style.cssText = "background: #f1f3f5; color: #555; border: 1px solid #dee2e6;";
    btnCorrect.style.cssText = "background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9;";
    btnWrong.style.cssText = "background: #ffebee; color: #c62828; border: 1px solid #ffcdd2;";

    if (type === 'all') btnAll.style.cssText = "background: #00796b; color: #fff; border: 1px solid #00796b; font-weight: bold;";
    if (type === 'correct') btnCorrect.style.cssText = "background: #2e7d32; color: #fff; border: 1px solid #2e7d32; font-weight: bold;";
    if (type === 'wrong') btnWrong.style.cssText = "background: #c62828; color: #fff; border: 1px solid #c62828; font-weight: bold;";
  }

  let html = "";

  questions.forEach((q, i) => {
    if (!q) return; 

    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = (q.answer || q.trảlời || "").toString().trim().toLowerCase();
    if (correctAns === "một") correctAns = "a";
    
    let ok = userAns !== "" && userAns === correctAns;

    if (type === 'correct' && !ok) return;
    if (type === 'wrong' && ok) return;

    let qText = q.question || q.cauhoi || "Không tìm thấy nội dung dữ liệu";
    let optA = q.a || q.Một || "";
    let optB = q.b || "";
    let optC = q.c || "";
    let optD = q.d || "";

    let fullCorrectText = "";
    if (correctAns === "a") fullCorrectText = `A. ${optA}`;
    else if (correctAns === "b") fullCorrectText = `B. ${optB}`;
    else if (correctAns === "c") fullCorrectText = `C. ${optC}`;
    else if (correctAns === "d") fullCorrectText = `D. ${optD}`;
    else fullCorrectText = (q.answer || q.trảlời || "Chưa rõ").toUpperCase();

    let fullUserText = "Không lựa chọn đáp án (Bỏ trống câu này)";
    if (userAns === "a") fullUserText = `A. ${optA}`;
    else if (userAns === "b") fullUserText = `B. ${optB}`;
    else if (userAns === "c") fullUserText = `C. ${optC}`;
    else if (userAns === "d") fullUserText = `D. ${optD}`;

    html += `
      <div style="
        margin-bottom: 24px;
        text-align: justify;
        line-height: 1.5;
        font-size: 15px;
        color: #111;
      ">
        <p style="margin: 0 0 6px 0; padding: 0; white-space: pre-wrap;"><b>Câu ${i + 1}.</b> ${qText}</p>
        
        <div style="margin: 0 0 6px 0; padding-left: 15px; font-size: 14.5px; color: #333;">
          <div style="margin-bottom: 3px;">
            <span style="color: #666;">- Phương án đã chọn:</span> ${fullUserText} 
            <span style="
              display: inline-block;
              padding: 1px 6px;
              font-size: 11px;
              font-family: 'Times New Roman', Times, serif;
              font-weight: bold;
              border-radius: 3px;
              margin-left: 8px;
              background-color: ${userAns === "" ? '#f1f3f5' : (ok ? '#e8f5e9' : '#ffebee')};
              color: ${userAns === "" ? '#555' : (ok ? '#2e7d32' : '#c62828')};
            ">${userAns === "" ? "CHƯA LÀM" : (ok ? "CHÍNH XÁC" : "KHÔNG ĐÚNG")}</span>
          </div>
          ${!ok ? `<div style="margin-bottom: 3px;"><span style="color: #666;">- Đáp án đúng:</span> <b style="color: #2e7d32;">${fullCorrectText}</b></div>` : ""}
        </div>

        <div style="
          margin: 6px 0 0 15px;
          padding: 4px 0 4px 10px;
          font-style: italic;
          font-size: 14px;
          color: #555;
          border-left: 2px solid #e0e0e0;
          white-space: pre-wrap;
        ">
          <b>Cơ sở lý luận (Giải thích):</b> ${q.explanation ? q.explanation : (q.giảithích ? q.giảithích : "Chưa có nội dung giải thích.")}
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html || `<p style='text-align:center; color:#777; font-style: italic; padding: 20px;'>Không tìm thấy câu hỏi nào phù hợp với danh sách lọc.</p>`;
}

// ================= HÀM BẢO VỆ DÀNH RIÊNG CHO TÀI KHOẢN CON =================
function enableProtectionForSubAccounts() {
  let user = JSON.parse(localStorage.getItem("user"));
  
  if (!user || user.role === "admin") {
    return; 
  }

  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    alert("Tài khoản học viên không được phép sử dụng chuột phải!");
  });

  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
  });
  document.addEventListener('mousedown', function(e) {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
    }
  });

  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
  });

  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";
  document.body.style.msUserSelect = "none";
  document.body.style.mozUserSelect = "none";

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && ['c', 'x', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      alert("Hệ thống đã khóa tính năng sao chép, cắt và lưu đề!");
      return false;
    }
    
    if (e.key === 'F12') {
      e.preventDefault();
      alert("Tính năng F12 đã bị khóa!");
      return false;
    }
    
    if (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }
  });

  window.addEventListener('blur', function() {
    let appEl = document.getElementById("app");
    if (appEl) appEl.style.filter = "blur(15px)";
  });
  
  window.addEventListener('focus', function() {
    let appEl = document.getElementById("app");
    if (appEl) appEl.style.filter = "none";
  });
}
