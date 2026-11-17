let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let inactivityChecker; // Biến quản lý đếm giờ không hoạt động
let time = 60 * 60; // 60 phút
let currentFilter = 'all'; 

const app = document.getElementById("app");
const FIREBASE_URL = "https://thi-trac-nghiem-ce1d4-default-rtdb.asia-southeast1.firebasedatabase.app";

// Thời gian tối đa không hoạt động trước khi tự động đăng xuất (12 giờ tính bằng mili-giây)
const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000;

function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

// Hàm chuyển đổi username an toàn cho Firebase
function safeKey(username) {
  return encodeURIComponent(username).replace(/\./g, '%2E');
}

// ================= QUẢN LÝ THỜI GIAN KHÔNG HOẠT ĐỘNG (12 GIỜ) =================
function updateLastActivity() {
  if (localStorage.getItem("user")) {
    localStorage.setItem("lastActiveTime", Date.now().toString());
  }
}

function isSessionExpiredByInactivity() {
  const lastActive = Number(localStorage.getItem("lastActiveTime") || 0);
  if (!lastActive) return false;
  return (Date.now() - lastActive) > INACTIVITY_LIMIT_MS;
}

function forceLogoutDueToInactivity() {
  clearInterval(timer);
  clearInterval(inactivityChecker);
  localStorage.removeItem("user");
  localStorage.removeItem("lastActiveTime");
  alert("⏰ Phiên đăng nhập đã hết hạn do không làm bài trong 12 giờ. Vui lòng đăng nhập lại!");
  showLogin();
}

function startInactivityWatcher() {
  clearInterval(inactivityChecker);

  // Lắng nghe các thao tác của người dùng để gia hạn mốc 12h
  ["click", "keydown", "touchstart"].forEach(evt => {
    window.removeEventListener(evt, updateLastActivity);
    window.addEventListener(evt, updateLastActivity, { passive: true });
  });

  // Kiểm tra định kỳ mỗi 60 giây xem đã quá 12h chưa
  inactivityChecker = setInterval(() => {
    if (localStorage.getItem("user") && isSessionExpiredByInactivity()) {
      forceLogoutDueToInactivity();
    }
  }, 60 * 1000);
}

// ================= ĐĂNG XUẤT CHỦ ĐỘNG =================
function logout() {
  if (!confirm("Bạn có chắc chắn muốn thoát đăng nhập không?")) return;
  clearInterval(timer);
  clearInterval(inactivityChecker);
  localStorage.removeItem("user");
  localStorage.removeItem("lastActiveTime");
  document.body.style.backgroundColor = "";
  document.body.style.padding = "";
  showLogin();
}

// ================= DANH SÁCH TÀI KHOẢN =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "ALONG", password: "1112233", role: "user" },
  { username: "CHINH1@", password: "1112233", role: "user" },
  { username: "AHOANG@", password: "1112233", role: "user" },
  { username: "HOANG2@", password: "1112233", role: "user" },
  { username: "HOANG3@", password: "1112233", role: "user" }
];

// ================= TÍNH TỶ LỆ % KHO ĐỀ THEO TÊN TÀI KHOẢN =================
function getUserPoolRatio(user) {
  if (!user || user.role === "admin") return 1; // Admin mở 100%
  const u = user.username || "";
  if (u.includes("1")) return 0.50; // Có số 1 -> 50%
  if (u.includes("2")) return 0.25; // Có số 2 -> 25%
  if (u.includes("3")) return 0.12; // Có số 3 -> 12%
  return 1; // Các user thường khác -> 100%
}

// ================= GIAO DIỆN ĐĂNG NHẬP =================
function showLogin() {
  clearInterval(timer);
  clearInterval(inactivityChecker);
  document.getElementById("loginBox").style.display = "block";
  if (app) app.style.display = "none";
  document.getElementById("loginBox").innerHTML = `
    <div class="box" style="max-width:400px;text-align:center;margin-top:120px">
      <h2>Đăng nhập hệ thống</h2>
      <input id="u" placeholder="Tài khoản" style="width:100%;padding:10px;margin:5px 0">
      <input id="p" type="password" placeholder="Mật khẩu" style="width:100%;padding:10px;margin:5px 0">
      <button id="btnLogin" onclick="login()" class="btn">Đăng nhập</button>
    </div>
  `;
}

// ================= XỬ LÝ ĐĂNG NHẬP (KẾT NỐI FIREBASE) =================
async function login() {
  let u = document.getElementById("u").value.trim();
  let p = document.getElementById("p").value.trim();

  let user = users.find(x => x.username === u && x.password === p);
  if (!user) return alert("Sai tài khoản hoặc mật khẩu!");

  let btn = document.getElementById("btnLogin");
  if (btn) {
    btn.innerText = "Đang kiểm tra thiết bị...";
    btn.disabled = true;
  }

  let deviceId = getDeviceId();

  if (user.role !== "admin") {
    try {
      const key = safeKey(user.username);
      const res = await fetch(`${FIREBASE_URL}/sessions/${key}.json`);
      const remoteSession = await res.json();

      // 1. Kiểm tra xem tài khoản đã bị khóa trước đó chưa
      if (remoteSession && remoteSession.isLocked) {
        if (btn) { btn.innerText = "Đăng nhập"; btn.disabled = false; }
        return alert("TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN do đăng nhập trên thiết bị khác. Vui lòng liên hệ Admin!");
      }

      // 2. Kiểm tra nếu đăng nhập trên thiết bị lạ
      if (remoteSession && remoteSession.deviceId !== deviceId) {
        await fetch(`${FIREBASE_URL}/sessions/${key}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            deviceId: remoteSession.deviceId,
            isLocked: true,
            lockedAt: new Date().toLocaleString("vi-VN")
          })
        });
        if (btn) { btn.innerText = "Đăng nhập"; btn.disabled = false; }
        return alert("CẢNH BÁO: Phát hiện đăng nhập trên thiết bị lạ. Tài khoản của bạn đã bị KHÓA VĨNH VIỄN!");
      }

      // 3. Lần đầu đăng nhập hoặc đúng thiết bị cũ
      await fetch(`${FIREBASE_URL}/sessions/${key}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          deviceId: deviceId,
          isLocked: false,
          lastLogin: new Date().toLocaleString("vi-VN")
        })
      });
    } catch (err) {
      if (btn) { btn.innerText = "Đăng nhập"; btn.disabled = false; }
      return alert("Lỗi kết nối máy chủ kiểm tra tài khoản! Vui lòng kiểm tra lại mạng.");
    }
  }

  localStorage.setItem("user", JSON.stringify(user));
  updateLastActivity();
  startInactivityWatcher();

  document.getElementById("loginBox").style.display = "none";
  if (app) app.style.display = "block";
  
  enableProtectionForSubAccounts();
  startExam();
}

// ================= KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP =================
async function checkLogin() {
  let user = JSON.parse(localStorage.getItem("user"));
  let deviceId = getDeviceId();

  if (!user) {
    showLogin();
    return;
  }

  // Kiểm tra thời gian không hoạt động quá 12h
  if (isSessionExpiredByInactivity()) {
    localStorage.removeItem("user");
    localStorage.removeItem("lastActiveTime");
    alert("⏰ Bạn đã không làm bài hơn 12 giờ. Vui lòng đăng nhập lại!");
    showLogin();
    return;
  }

  if (user.role !== "admin") {
    try {
      const key = safeKey(user.username);
      const res = await fetch(`${FIREBASE_URL}/sessions/${key}.json`);
      const remoteSession = await res.json();

      if (!remoteSession) {
        localStorage.removeItem("user");
        showLogin();
        return;
      }

      if (remoteSession.isLocked) {
        alert("TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN. Vui lòng liên hệ Admin!");
        localStorage.removeItem("user");
        showLogin();
        return;
      }

      if (remoteSession.deviceId !== deviceId) {
        alert("Phiên đăng nhập không hợp lệ (Phát hiện đăng nhập trái phép)!");
        localStorage.removeItem("user");
        showLogin();
        return;
      }
    } catch (err) {
      console.error("Không thể đồng bộ trạng thái từ Firebase:", err);
    }
  }

  updateLastActivity();
  startInactivityWatcher();

  document.getElementById("loginBox").style.display = "none";
  if (app) app.style.display = "block";
  
  enableProtectionForSubAccounts();
  startExam();
}

// ================= TỰ ĐỘNG NẠP TẤT CẢ FILE JSON CÓ TRONG THƯ MỤC =================
async function taiTatCaDuLieuCauHoi() {
  const danhSachFiles = [
    "./cau_hoi/p1.json",
    "./cau_hoi/p2.json",
    "./cau_hoi/p3.json",
    "./cau_hoi/p4.json",
    "./cau_hoi/p5.json",
    "./cau_hoi/p6.json",
    "./cau_hoi/p7.json",
    "./cau_hoi/p8.json",
    "./cau_hoi/p9.json",
    "./cau_hoi/p10.json",
    "./cau_hoi/pcuathay.json"
  ];
  
  let beCauHoiTong = [];

  for (const duongDan of danhSachFiles) {
    try {
      const res = await fetch(duongDan);
      if (!res.ok) throw new Error();
      const json = await res.json();
      
      const fileTag = duongDan.split('/').pop().replace('.json', '');
      json.forEach(q => { q.fileSource = fileTag; });
      beCauHoiTong = beCauHoiTong.concat(json);
    } catch (err) {
      console.error(`❌ Không tìm thấy hoặc sai cấu trúc định dạng tại file: ${duongDan}`);
    }
  }

  if (beCauHoiTong.length === 0) return [];

  beCauHoiTong.forEach(q => {
    q.weight = q.weight || 1;
    q.correctCount = q.correctCount || 0;
    q.wrongCount = q.wrongCount || 0;
  });

  return beCauHoiTong;
}

// ================= KHỞI ĐỘNG HỆ THỐNG =================
async function khoiDongUngDung() {
  const fileData = await taiTatCaDuLieuCauHoi();
  
  if (fileData.length === 0) {
    alert("Không tìm thấy dữ liệu câu hỏi trong thư mục cau_hoi! Vui lòng kiểm tra lại đường dẫn.");
    return;
  }

  const savedStats = JSON.parse(localStorage.getItem("userStats") || "{}");

  fileData.forEach(q => {
    let qText = (q.question || q.cauhoi || "").trim();
    if (savedStats[qText]) {
      const stats = savedStats[qText];
      q.weight = stats.weight || 1;
      q.correctCount = stats.correctCount || 0;
      q.wrongCount = stats.wrongCount || 0;
      q.fileSource = stats.fileSource || q.fileSource;
    } else {
      q.weight = q.weight || 1;
      q.correctCount = q.correctCount || 0;
      q.wrongCount = q.wrongCount || 0;
    }
  });

  data = fileData;
  checkLogin();
}

khoiDongUngDung();

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
  updateLastActivity();
  answers = {};
  index = 0;
  time = 60 * 60;

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const poolRatio = getUserPoolRatio(user);

  let allowedData = [];
  const danhSachFileGoc = [...new Set(data.map(q => q.fileSource).filter(Boolean))];
  danhSachFileGoc.forEach(fileKey => {
    let fileAll = data.filter(q => q.fileSource === fileKey);
    if (poolRatio < 1) {
      let allowedCount = Math.max(1, Math.floor(fileAll.length * poolRatio));
      allowedData = allowedData.concat(fileAll.slice(0, allowedCount));
    } else {
      allowedData = allowedData.concat(fileAll);
    }
  });

  window.activeAllowedData = allowedData;

  const baseLimit = (user.role === "admin") ? 50 : 100;
  const targetLimit = Math.min(baseLimit, allowedData.length);

  let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

  let poolCheck = allowedData.filter(q => !correctPool.includes((q.question || q.cauhoi || "").trim()));
  if (poolCheck.length === 0 && allowedData.length > 0) {
    localStorage.removeItem("correctPool");
    correctPool = [];
    allowedData.forEach(q => { q.weight = 1; q.correctCount = 0; q.wrongCount = 0; });
  }

  const danhSachFileThucTe = [...new Set(allowedData.map(q => q.fileSource).filter(Boolean))];
  const tongSoCauTrongKho = allowedData.length || 1;
  const soLuongFile = danhSachFileThucTe.length || 1;

  let khoCauHoiCacFile = {};
  let chiTieuMoiFile = {}; 

  danhSachFileThucTe.forEach(fileKey => {
    let tongCauGocCuaFile = allowedData.filter(q => q.fileSource === fileKey).length;
    let quota = Math.round((tongCauGocCuaFile / tongSoCauTrongKho) * targetLimit);
    if (quota === 0 && tongCauGocCuaFile > 0) quota = 1; 
    chiTieuMoiFile[fileKey] = quota;

    let fileQuestions = allowedData.filter(q => q.fileSource === fileKey && !correctPool.includes((q.question || q.cauhoi || "").trim()));
    fileQuestions = shuffle(fileQuestions);

    let wrongInFile = fileQuestions.filter(q => (q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0));
    let normalInFile = fileQuestions.filter(q => !((q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0)));
    
    khoCauHoiCacFile[fileKey] = [...wrongInFile, ...normalInFile];
  });

  let finalSelectedList = [];

  danhSachFileThucTe.forEach((fileKey, i) => {
    let poolHienTai = khoCauHoiCacFile[fileKey];
    let quotaCanLay = chiTieuMoiFile[fileKey];
    
    let thucTeLay = poolHienTai.splice(0, quotaCanLay);
    finalSelectedList = finalSelectedList.concat(thucTeLay);

    if (thucTeLay.length < quotaCanLay) {
      let soCauThieu = quotaCanLay - thucTeLay.length;
      let buocNhay = 1;
      while (soCauThieu > 0 && buocNhay < soLuongFile) {
        let indexFileLienKe = (i + buocNhay) % soLuongFile;
        let fileLienKeKey = danhSachFileThucTe[indexFileLienKe];
        let poolLienKe = khoCauHoiCacFile[fileLienKeKey];
        if (poolLienKe && poolLienKe.length > 0) {
          let soCauLayBu = Math.min(soCauThieu, poolLienKe.length);
          finalSelectedList = finalSelectedList.concat(poolLienKe.splice(0, soCauLayBu));
          soCauThieu -= soCauLayBu;
        }
        buocNhay++;
      }
    }
  });

  if (finalSelectedList.length < targetLimit) {
    let thieuTong = targetLimit - finalSelectedList.length;
    let khoVetCacFile = [];
    danhSachFileThucTe.forEach(fileKey => khoVetCacFile = khoVetCacFile.concat(khoCauHoiCacFile[fileKey]));
    
    if (khoVetCacFile.length > 0) {
      let extra = shuffle(khoVetCacFile).slice(0, thieuTong);
      finalSelectedList = finalSelectedList.concat(extra);
    }
  }

  let selectedQuestions = shuffle(finalSelectedList).slice(0, targetLimit);

  questions = selectedQuestions.map(q => {
    let clonedQ = JSON.parse(JSON.stringify(q));
    let rawCorrectKey = (clonedQ.answer || clonedQ.trảlời || "").toString().trim().toLowerCase();
    if (rawCorrectKey === "một") rawCorrectKey = "a";

    let optA = clonedQ.a || clonedQ.A || clonedQ.Một || "";
    let optB = clonedQ.b || clonedQ.B || "";
    let optC = clonedQ.c || clonedQ.C || "";
    let optD = clonedQ.d || clonedQ.D || "";

    let originalOptions = [
      { text: optA, key: 'a' }, { text: optB, key: 'b' }, { text: optC, key: 'c' }, { text: optD, key: 'd' }
    ];

    let shuffled = shuffle(originalOptions);
    let newCorrectIndex = shuffled.findIndex(opt => opt.key === rawCorrectKey);
    let indexToLetter = ['a', 'b', 'c', 'd'];
    
    clonedQ.shuffledOptions = shuffled; 
    clonedQ.newCorrectAnswer = indexToLetter[newCorrectIndex] || 'a'; 

    return clonedQ;
  });
  // Tự động in thống kê trộn bộ đề chi tiết vào Console chỉ dành cho Admin
  if (user.role === "admin") {
    const bangThongKe = {};
    let tongDaLay = 0;
    let tongCauSaiLamLai = 0;

    danhSachFileGoc.forEach(fileKey => {
      const tongKhoPhan = allowedData.filter(q => q.fileSource === fileKey).length;
      const cacCauDaLay = questions.filter(q => q.fileSource === fileKey);
      const soCauDaLay = cacCauDaLay.length;
      const soCauSai = cacCauDaLay.filter(q => (q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0)).length;

      const tyLeDe = questions.length > 0 ? ((soCauDaLay / questions.length) * 100).toFixed(1) + "%" : "0%";
      const tyLeKho = tongKhoPhan > 0 ? ((soCauDaLay / tongKhoPhan) * 100).toFixed(1) + "%" : "0%";

      bangThongKe[fileKey] = {
        "Tổng kho (câu)": tongKhoPhan,
        "Đã lấy (câu)": soCauDaLay,
        "Tỷ lệ trong đề": tyLeDe,
        "Tỷ lệ / kho phần": tyLeKho,
        "Câu sai làm lại": soCauSai
      };

      tongDaLay += soCauDaLay;
      tongCauSaiLamLai += soCauSai;
    });

    bangThongKe["TỔNG CỘNG"] = {
      "Tổng kho (câu)": allowedData.length,
      "Đã lấy (câu)": tongDaLay,
      "Tỷ lệ trong đề": "100%",
      "Tỷ lệ / kho phần": allowedData.length > 0 ? ((tongDaLay / allowedData.length) * 100).toFixed(1) + "%" : "0%",
      "Câu sai làm lại": tongCauSaiLamLai
    };

    console.log(`%c📊 BÁO CÁO PHÂN BỔ ĐỀ THI (${questions.length} CÂU)`, "color: #00796b; font-weight: bold; font-size: 14px;");
    console.table(bangThongKe);
  }
  render();
  startTimer();
}

// ================= HIỂN THỊ CÂU HỎI VÀ ĐÁP ÁN =================
function render() {
  if (!app) return;
  if (questions.length === 0 || !questions[index]) {
    app.innerHTML = `<div class="box"><h2>Dữ liệu câu hỏi bị lỗi hoặc bộ nhớ tạm rỗng! Vui lòng làm mới trang.</h2></div>`;
    return;
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  let q = questions[index];
  let qText = q.question || q.cauhoi || "Nội dung câu hỏi rỗng";
  
  let optA = q.shuffledOptions ? q.shuffledOptions[0].text : (q.a || q.A || q.Một || "");
  let optB = q.shuffledOptions ? q.shuffledOptions[1].text : (q.b || q.B || "");
  let optC = q.shuffledOptions ? q.shuffledOptions[2].text : (q.c || q.C || "");
  let optD = q.shuffledOptions ? q.shuffledOptions[3].text : (q.d || q.D || "");

  app.innerHTML = `
    <div class="box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #eee;">
        <span style="font-size:13px; color:#555;">👤 Tài khoản: <b>${user.username || ""}</b></span>
        <button onclick="logout()" style="background:#6c757d; color:#fff; border:none; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:13px;">Thoát đăng nhập</button>
      </div>

      <div class="top">
        <div>Câu: ${index + 1}/${questions.length}</div>
        <div>⏱ Thời gian: <span id="time"></span></div>
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
        <button class="nav-btn" onclick="prev()">← Câu trước</button>
        <button class="nav-btn" onclick="next()">Câu sau →</button>
      </div>

      <button class="btn" style="margin-top:15px; background:#b30000; color:#fff;" onclick="submit()">NỘP BÀI THI</button>

      <div id="nav"></div>
    </div>
  `;

  highlight();
  updateBar();
  renderNav();
}

function choose(c) {
  updateLastActivity();
  answers[index] = c;
  highlight();
}

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
      updateLastActivity();
      index = i;
      render();
    };

    nav.appendChild(btn);
  });
}

function next() {
  updateLastActivity();
  if (index < questions.length - 1) {
    index++;
    render();
  }
}

function prev() {
  updateLastActivity();
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

// ================= ĐỒNG HỒ ĐẾM NGƯỢC =================
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

// ================= NỘP BÀI VÀ CHẤM ĐIỂM =================
function submit() {
  updateLastActivity();
  let user = JSON.parse(localStorage.getItem("user") || "{}");
  let answeredCount = Object.keys(answers).length;

  if (user.role !== "admin" && answeredCount < questions.length) {
    alert(`⚠️ Bạn chưa hoàn thành bài thi! \n\nVui lòng trả lời đủ ${questions.length} câu. \nHiện tại bạn mới làm: ${answeredCount} câu.`);
    for (let i = 0; i < questions.length; i++) {
      if (!answers[i]) {
        index = i;
        render();
        return;
      }
    }
    return;
  }

  if (!confirm("Bạn có chắc chắn muốn nộp bài thi không?")) return;

  clearInterval(timer);

  let correct = 0;
  let wrong = 0;
  let submittedCount = 0;
  let newWrong = [];

  let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

  questions.forEach((q, i) => {
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = q.newCorrectAnswer ? q.newCorrectAnswer.toString().trim().toLowerCase() : (q.answer || q.trảlời || "").toString().trim().toLowerCase();
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

  let statsToSave = {};
  data.forEach(q => {
    let qText = (q.question || q.cauhoi || "").trim();
    statsToSave[qText] = {
      weight: q.weight,
      correctCount: q.correctCount,
      wrongCount: q.wrongCount,
      fileSource: q.fileSource
    };
  });
  localStorage.setItem("userStats", JSON.stringify(statsToSave)); 

  const currentStore = window.activeAllowedData || data;
  let totalCorrectInStore = currentStore.filter(q => correctPool.includes((q.question || q.cauhoi || "").trim())).length;
  let totalRemainingInStore = Math.max(0, currentStore.length - totalCorrectInStore);

  wrongPool = newWrong;

  document.body.style.backgroundColor = "#f4f5f7";
  document.body.style.margin = "0";
  document.body.style.padding = "20px 0";

  if(app) {
    app.innerHTML = `
      <div style="max-width: 820px; margin: 0 auto; background: #ffffff; padding: 40px 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-radius: 8px; font-family: 'Times New Roman', Times, serif;">
        <div style="text-align: right; margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-right: 4px solid #00796b;">
            <div style="color: #444; margin-bottom: 5px;">Số câu đã làm đúng: <b style="color: #00796b; font-size: 16px;">${totalCorrectInStore}</b></div>
            <div style="color: #444;">Số câu còn lại: <b style="color: #c62828; font-size: 16px;">${totalRemainingInStore}</b></div>
        </div>

        <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 10px 0; color: #111;">BÁO CÁO KẾT QUẢ KIỂM TRA</h1>
        <p style="text-align: center; font-size: 15px; color: #555; margin: 0 0 20px 0;">
          Số câu đã hoàn thành: <b>${submittedCount}/${questions.length}</b><br>
          Số câu đúng: <b style="color: #2e7d32;">${correct}</b> | Sai: <b style="color: #c62828;">${wrong}</b>
        </p>
        <div style="text-align: center; margin-bottom: 25px;">
          <button class="btn" style="background: #00796b; color: white; padding: 10px 28px; border-radius: 20px; cursor: pointer; border: none; margin: 5px;" onclick="location.reload()">THI VÒNG ĐỀ MỚI</button>
          <button class="btn" style="background: #6c757d; color: white; padding: 10px 24px; border-radius: 20px; cursor: pointer; border: none; margin: 5px;" onclick="logout()">THOÁT ĐĂNG NHẬP</button>
        </div>
        <div id="result-list"></div>
      </div>
    `;
  }
  filterResult('all');
}

// ================= BỘ LỌC ĐÁP ÁN KHẢO SÁT KẾT QUẢ THI =================
function filterResult(type) {
  currentFilter = type;
  let listContainer = document.getElementById("result-list");
  if (!listContainer) return;

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = (user.role === 'admin');

  let filterBar = document.getElementById("filter-bar");
  if (!filterBar) {
    let div = document.createElement("div");
    div.id = "filter-bar";
    div.style.cssText = "text-align: center; margin-bottom: 20px;";
    div.innerHTML = `
      <button id="btn-filter-all" onclick="filterResult('all')">Tất cả</button>
      <button id="btn-filter-correct" onclick="filterResult('correct')">Câu đúng</button>
      <button id="btn-filter-wrong" onclick="filterResult('wrong')">Câu sai</button>
    `;
    listContainer.parentNode.insertBefore(div, listContainer);
  }

  const btnAll = document.getElementById("btn-filter-all");
  const btnCorrect = document.getElementById("btn-filter-correct");
  const btnWrong = document.getElementById("btn-filter-wrong");

  const baseBtnStyle = "padding: 6px 16px; margin: 5px; cursor: pointer; border: 1px solid #dee2e6; border-radius: 4px; transition: 0.3s;";
  btnAll.style.cssText = baseBtnStyle + (type === 'all' ? 'background: #00796b; color: #fff; font-weight: bold;' : 'background: #f1f3f5;');
  btnCorrect.style.cssText = baseBtnStyle + (type === 'correct' ? 'background: #2e7d32; color: #fff; font-weight: bold;' : 'background: #e8f5e9;');
  btnWrong.style.cssText = baseBtnStyle + (type === 'wrong' ? 'background: #c62828; color: #fff; font-weight: bold;' : 'background: #ffebee;');

  let html = "";
  questions.forEach((q, i) => {
    if (!q) return;

    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = (q.newCorrectAnswer || q.answer || q.trảlời || "").toString().trim().toLowerCase();
    if (correctAns === "một") correctAns = "a";

    let isDone = (userAns !== "");
    let isCorrect = (isDone && userAns === correctAns);
    let isWrong = (isDone && userAns !== correctAns);

    if (type === 'correct' && !isCorrect) return;
    if (type === 'wrong' && !isWrong) return;

    let fileTag = (isAdmin && q.fileSource) ? ` <span style="font-size: 11px; color: #888; font-style: italic; background: #eee; padding: 1px 4px; border-radius: 3px;">(${q.fileSource.replace('.json', '')})</span>` : "";

    let qText = q.question || q.cauhoi || "Dữ liệu lỗi";
    let mapAns = {
      a: q.shuffledOptions ? q.shuffledOptions[0].text : (q.a || q.A || q.Một || ""),
      b: q.shuffledOptions ? q.shuffledOptions[1].text : (q.b || q.B || ""),
      c: q.shuffledOptions ? q.shuffledOptions[2].text : (q.c || q.C || ""),
      d: q.shuffledOptions ? q.shuffledOptions[3].text : (q.d || q.D || "")
    };

    let fullCorrectText = mapAns[correctAns] ? `${correctAns.toUpperCase()}. ${mapAns[correctAns]}` : correctAns.toUpperCase();
    let fullUserText = mapAns[userAns] ? `${userAns.toUpperCase()}. ${mapAns[userAns]}` : "Chưa chọn đáp án";

    html += `
      <div style="margin-bottom: 24px; padding-bottom: 10px; border-bottom: 1px solid #eee; text-align: justify; line-height: 1.5; font-size: 15px;">
        <p style="margin: 0 0 6px 0;"><b>Câu ${i + 1}.</b> ${qText}${fileTag}</p>
        <div style="margin: 0 0 6px 0; padding-left: 15px;">
          <div><span style="color: #666;">- Đã chọn:</span> ${fullUserText}
            <span style="padding: 1px 6px; font-size: 11px; font-weight: bold; border-radius: 3px; margin-left: 8px; background-color: ${!isDone ? '#f1f3f5' : (isCorrect ? '#e8f5e9' : '#ffebee')}; color: ${!isDone ? '#555' : (isCorrect ? '#2e7d32' : '#c62828')};">
              ${!isDone ? "CHƯA LÀM" : (isCorrect ? "CHÍNH XÁC" : "SAI")}
            </span>
          </div>
          ${isWrong ? `<div><span style="color: #666;">- Đáp án đúng:</span> <b style="color: #2e7d32;">${fullCorrectText}</b></div>` : ""}
        </div>
        <div style="margin: 6px 0 0 15px; padding: 4px 10px; font-style: italic; font-size: 14px; color: #555; border-left: 2px solid #e0e0e0;">
          <b>Giải thích:</b> ${q.explanation || q.giảithích || "Chưa có giải thích."}
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html || `<p style='text-align:center; color:#777; font-style: italic; padding: 20px;'>Không tìm thấy câu hỏi nào phù hợp.</p>`;
}

// ================= HÀM KHÓA AN TOÀN CHỐT SAO CHÉP ĐỀ THI =================
function enableProtectionForSubAccounts() {
  let user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role === "admin") return; 

  document.addEventListener('contextmenu', function(e) { e.preventDefault(); alert("Hệ thống kiểm tra đã khóa chuột phải học viên!"); });
  document.addEventListener('selectstart', function(e) { e.preventDefault(); });
  document.addEventListener('mousedown', function(e) { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') e.preventDefault(); });
  document.addEventListener('dragstart', function(e) { e.preventDefault(); });

  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";
  document.body.style.msUserSelect = "none";
  document.body.style.mozUserSelect = "none";

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && ['c', 'x', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      alert("Hành vi sao chép/tải đề đã bị ngăn chặn!");
      return false;
    }
    if (e.key === 'F12') { e.preventDefault(); alert("F12 Console đã bị khóa!"); return false; }
    if (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) { e.preventDefault(); return false; }
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

// ================= XỬ LÝ LƯỚT MÀN HÌNH (SWIPE) - CHỈ ADMIN =================
(function() {
    let touchstartX = 0;
    let touchendX = 0;
    const threshold = 50;

    document.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        handleGesture();
    }, { passive: true });

    function handleGesture() {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.role !== "admin") return;

        const isExamining = document.getElementById("time") !== null && document.getElementById("nav") !== null;
        if (!isExamining) return;

        const diff = touchstartX - touchendX;
        if (Math.abs(diff) > threshold) {
            if (diff > 0) next();
            else prev();
        }
    }
})();

// ================= HÀM MỞ KHÓA TÀI KHOẢN TỪ XA CHO ADMIN =================
async function resetUserStatus(username) {
  try {
    const key = safeKey(username);
    await fetch(`${FIREBASE_URL}/sessions/${key}.json`, {
      method: "DELETE"
    });
    console.log("Đã mở khóa hoàn toàn tài khoản trên Firebase: " + username);
    alert("Đã mở khóa hoàn toàn tài khoản: " + username);
  } catch (err) {
    alert("Lỗi khi mở khóa: " + err.message);
  }
}
