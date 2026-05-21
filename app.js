let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60; // 60 phút
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

// ================= DANH SÁCH TÀI KHOẢN =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "huyen@", password: "1112233", role: "user" }
];
let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

// ================= GIAO DIỆN ĐĂNG NHẬP =================
function showLogin() {
  // Đảm bảo hộp đăng nhập hiển thị đúng cấu trúc DOM
  let loginBox = document.getElementById("loginBox");
  if (!loginBox) {
    loginBox = document.createElement("div");
    loginBox.id = "loginBox";
    document.body.insertBefore(loginBox, app);
  }
  
  loginBox.style.display = "block";
  app.style.display = "none";

  loginBox.innerHTML = `
    <div class="box" style="max-width:400px;text-align:center;margin: 120px auto 0 auto;">
      <h2>Đăng nhập hệ thống</h2>
      <input id="u" placeholder="Tài khoản" style="width:100%;padding:10px;margin:5px 0">
      <input id="p" type="password" placeholder="Mật khẩu" style="width:100%;padding:10px;margin:5px 0">
      <button onclick="login()" class="btn">Đăng nhập</button>
    </div>
  `;
}

// ================= XỬ LÝ ĐĂNG NHẬP =================
function login() {
  let u = document.getElementById("u").value.trim();
  let p = document.getElementById("p").value;

  let user = users.find(x => x.username === u && x.password === p);
  if (!user) return alert("Sai tài khoản hoặc mật khẩu!");

  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  if (user.role !== "admin") {
    if (sessions[user.username] && sessions[user.username] !== deviceId) {
      alert("Tài khoản này đang được đăng nhập trên một thiết bị khác!");
      return;
    </div>
  }

  sessions[user.username] = deviceId;
  localStorage.setItem("loginSessions", JSON.stringify(sessions));
  localStorage.setItem("user", JSON.stringify(user));

  let loginBox = document.getElementById("loginBox");
  if (loginBox) loginBox.style.display = "none";
  app.style.display = "block";
  
  enableProtectionForSubAccounts();
  startExam();
}

// ================= KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP =================
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
      alert("Phiên đăng nhập hết hạn (thiết bị khác đã đăng nhập)!");
      localStorage.removeItem("user");
      showLogin();
      return;
    }
  }

  let loginBox = document.getElementById("loginBox");
  if (loginBox) loginBox.style.display = "none";
  app.style.display = "block";
  enableProtectionForSubAccounts();
  startExam();
}

// ================= TỰ ĐỘNG NẠP TẤT CẢ FILE JSON (SỬA LỖI UNEXPECTED TOKEN '<') =================
async function taiTatCaDuLieuCauHoi() {
  const danhSachFiles = [
    "./cau_hoi/p1.json",
    "./cau_hoi/p2.json",
    "./cau_hoi/p3.json",
    "./cau_hoi/p4.json"
  ];
  
  let beCauHoiTong = [];

  console.log("=== BẮT ĐẦU KIỂM TRA VÀ TẢI DỮ LIỆU FILE ===");
  for (const duongDan of danhSachFiles) {
    try {
      const res = await fetch(duongDan);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      // KIỂM TRA BẢO VỆ: Nếu Vercel trả về HTML trang lỗi 404 thay vì file JSON
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        console.warn(`⚠️ Hệ thống chặn file lỗi: ${duongDan} trả về HTML thay vì JSON (Lỗi 404 đường dẫn trên Vercel).`);
        continue; 
      }

      const json = await res.json();
      const fileTag = duongDan.split('/').pop().replace('.json', '');
      json.forEach(q => { q.fileSource = fileTag; });

      console.log(`✓ Tải thành công: ${duongDan} | Quy mô: ${json.length} câu.`);
      beCauHoiTong = beCauHoiTong.concat(json);
    } catch (err) {
      console.error(`❌ Không tìm thấy hoặc sai định dạng tại file: ${duongDan}`, err);
    }
  }

  console.log(`➡️ TỔNG SỐ CÂU HỎI THỰC TẾ LOAD ĐƯỢC: ${beCauHoiTong.length} câu.`);
  console.log("=================================================");

  if (beCauHoiTong.length === 0) return [];

  beCauHoiTong.forEach(q => {
    q.weight = q.weight || 1;
    q.correctCount = q.correctCount || 0;
    q.wrongCount = q.wrongCount || 0;
  });

  return beCauHoiTong;
}

// ================= KHỞI ĐỘNG ỨNG DỤNG AN TOÀN =================
async function khoiDongUngDung() {
  const fileData = await taiTatCaDuLieuCauHoi();
  
  if (fileData.length === 0) {
    const localData = localStorage.getItem("questionData");
    if (localData) {
      data = JSON.parse(localData);
    } else {
      console.error("Kho dữ liệu trống hoàn toàn (Cả file JSON lẫn bộ nhớ LocalStorage).");
      data = []; 
    }
    checkLogin(); // Đảm bảo luôn gọi checkLogin để hiện khung Đăng nhập, chống trắng màn hình
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
        if(oldQ.fileSource) q.fileSource = oldQ.fileSource;
      }
    });
  }

  data = fileData;
  localStorage.setItem("questionData", JSON.stringify(data));
  checkLogin();
}

// Chạy khởi động hệ thống
khoiDongUngDung();

// ================= THUẬT TOÁN TRỘN MẢNG =================
function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ================= KHỞI TẠO ĐỀ THI & ĐẢO NGẪU NHIÊN ĐÁP ÁN =================
function startExam() {
  answers = {};
  index = 0;
  time = 60 * 60;

  let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

  let poolCheck = data.filter(q => !correctPool.includes((q.question || q.cauhoi || "").trim()));
  if (poolCheck.length === 0 && data.length > 0) {
    console.log("🚨 HỌC VIÊN ĐÃ LÀM ĐÚNG HẾT KHO ĐỀ! TIẾN HÀNH RESET VÒNG MỚI");
    localStorage.removeItem("correctPool");
    correctPool = [];
    data.forEach(q => { q.weight = 1; q.correctCount = 0; q.wrongCount = 0; });
  }

  const danhSachFileThucTe = [...new Set(data.map(q => q.fileSource).filter(Boolean))];
  const tongSoCauTrongKho = data.length || 1;
  const soLuongFile = danhSachFileThucTe.length || 1;

  let khoCauHoiCacFile = {};
  let chiTieuMoiFile = {}; 

  console.log(`=== THUẬT TOÁN ĐỀ PHÂN BỔ TRẢI ĐỀU % (TỔNG KHO KHO: ${tongSoCauTrongKho} CÂU) ===`);

  danhSachFileThucTe.forEach(fileKey => {
    let tongCauGocCuaFile = data.filter(q => q.fileSource === fileKey).length;
    
    let quota = Math.round((tongCauGocCuaFile / tongSoCauTrongKho) * 100);
    if (quota === 0 && tongCauGocCuaFile > 0) quota = 1; 
    chiTieuMoiFile[fileKey] = quota;

    let fileQuestions = data.filter(q => q.fileSource === fileKey && !correctPool.includes((q.question || q.cauhoi || "").trim()));
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
          let cauBu = poolLienKe.splice(0, soCauLayBu);
          finalSelectedList = finalSelectedList.concat(cauBu);
          soCauThieu -= soCauLayBu;
        }
        buocNhay++;
      }
    }
  });

  if (finalSelectedList.length < 100) {
    let thieuTong = 100 - finalSelectedList.length;
    let khoVetCacFile = [];
    danhSachFileThucTe.forEach(fileKey => {
      khoVetCacFile = khoVetCacFile.concat(khoCauHoiCacFile[fileKey]);
    });
    
    if (khoVetCacFile.length > 0) {
      khoVetCacFile = shuffle(khoVetCacFile);
      let extra = khoVetCacFile.slice(0, thieuTong);
      finalSelectedList = finalSelectedList.concat(extra);
    }
  }

  let rawSelected100 = shuffle(finalSelectedList).slice(0, 100);

  // 🔄 THUẬT TOÁN ĐẢO ĐÁP ÁN KHÔNG PHÁ VỠ LOGIC GỐC
  questions = rawSelected100.map(q => {
    let originalAnsKey = (q.answer || q.trảlời || "").toString().trim().toUpperCase();
    if (originalAnsKey === "MỘT") originalAnsKey = "A";
    
    let correctText = "";
    if (originalAnsKey === "A") correctText = q.a || q.A || q.Một || "";
    else if (originalAnsKey === "B") correctText = q.b || q.B || "";
    else if (originalAnsKey === "C") correctText = q.c || q.C || "";
    else if (originalAnsKey === "D") correctText = q.d || q.D || "";
    else correctText = originalAnsKey; 

    let optionsArray = [];
    if (q.a || q.A || q.Một) optionsArray.push(q.a || q.A || q.Một);
    if (q.b || q.B) optionsArray.push(q.b || q.B);
    if (q.c || q.C) optionsArray.push(q.c || q.C);
    if (q.d || q.D) optionsArray.push(q.d || q.D);

    optionsArray = shuffle(optionsArray);

    let newQ = { ...q };
    newQ.shuffledOpts = {
      A: optionsArray[0] || "",
      B: optionsArray[1] || "",
      C: optionsArray[2] || "",
      D: optionsArray[3] || ""
    };
    
    newQ.correctTextTarget = correctText.toString().trim().toLowerCase();
    return newQ;
  });

  render();
  startTimer();
}

// ================= GIAO DIỆN HIỂN THỊ CÂU HỎI =================
function render() {
  if (questions.length === 0 || !questions[index]) {
    app.innerHTML = `<div class="box"><h2>Dữ liệu câu hỏi bị lỗi hoặc trống! Vui lòng tải lại trang.</h2></div>`;
    return;
  }

  let q = questions[index];
  let qText = q.question || q.cauhoi || "Nội dung câu hỏi rỗng";
  
  let optA = q.shuffledOpts ? q.shuffledOpts.A : (q.a || q.A || q.Một || "");
  let optB = q.shuffledOpts ? q.shuffledOpts.B : (q.b || q.B || "");
  let optC = q.shuffledOpts ? q.shuffledOpts.C : (q.c || q.C || "");
  let optD = q.shuffledOpts ? q.shuffledOpts.D : (q.d || q.D || "");

  app.innerHTML = `
    <div class="box">
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
  answers[index] = c;
  highlight();
  renderNav();
}

function highlight() {
  document.querySelectorAll(".option").forEach(b => b.classList.remove("selected"));
  let ans = answers[index];
  if (!ans) return;

  const map = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
  let btns = document.querySelectorAll(".option");
  if (btns[map[ans]]) {
    btns[map[ans]].classList.add("selected");
  }
}

function renderNav() {
  let nav = document.getElementById("nav");
  if (!nav) return;
  nav.innerHTML = "";

  let fragment = document.createDocumentFragment();
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
    fragment.appendChild(btn);
  });
  nav.appendChild(fragment);
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

// ================= NỘP BÀI VÀ CHẤM ĐIỂM THEO CHUỖI VĂN BẢN (TEXT-MATCHING) =================
function submit() {
  clearInterval(timer);

  let correct = 0;
  let wrong = 0;
  let submittedCount = 0; 
  let newWrong = [];

  let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

  questions.forEach((q, i) => {
    let userAnsLetter = answers[i] ? answers[i].toString().trim().toUpperCase() : "";
    
    let userAnsText = "";
    if (userAnsLetter && q.shuffledOpts) {
      userAnsText = q.shuffledOpts[userAnsLetter].toString().trim().toLowerCase();
    }

    // Đối chiếu nội dung chữ thực tế thay vì ký tự nhãn (A,B,C,D) để tránh lệch vị trí đã đảo
    let isCorrect = userAnsText !== "" && userAnsText === q.correctTextTarget;

    let qTextId = (q.question || q.cauhoi || "").trim();
    let originalQ = data.find(x => (x.question || x.cauhoi || "").trim() === qTextId);
    if (!originalQ) originalQ = q; 

    originalQ.weight = originalQ.weight || 1;
    originalQ.correctCount = originalQ.correctCount || 0;
    originalQ.wrongCount = originalQ.wrongCount || 0;

    if (userAnsLetter !== "") {
      submittedCount++; 
      if (isCorrect) {
        correct++;
        originalQ.correctCount++;
        originalQ.weight = Math.max(1, originalQ.weight - 0.3);
        if (!correctPool.includes(qTextId)) correctPool.push(qTextId);
      } else {
        wrong++;
        newWrong.push(originalQ);
        originalQ.wrongCount++;
        originalQ.weight = Math.min(10, originalQ.weight + 1.2); 
        let cIndex = correctPool.indexOf(qTextId);
        if (cIndex > -1) correctPool.splice(cIndex, 1);
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
    <div style="max-width: 820px; margin: 0 auto; background: #ffffff; padding: 40px 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-radius: 8px; font-family: 'Times New Roman', Times, serif;">
      <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 10px 0; color: #111; letter-spacing: 0.5px;">BÁO CÁO KẾT QUẢ KIỂM TRA</h1>
      <p style="text-align: center; font-size: 15px; color: #555; margin: 0 0 20px 0; line-height: 1.6;">
        Số câu đã hoàn thành: <b style="color: #00796b; font-size: 16px;">${submittedCount}/${questions.length}</b><br>
        Số câu đúng: <b style="color: #2e7d32; font-size: 16px;">${correct}</b> | Số câu sai/Chưa chọn: <b style="color: #c62828; font-size: 16px;">${wrong}</b>
      </p>
      <div style="text-align: center; margin-bottom: 25px;">
        <button class="btn" style="background: #00796b; color: white; border: none; padding: 10px 28px; font-size: 14px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 20px; font-weight: bold;" onclick="location.reload()">THI VÒNG ĐỀ MỚI</button>
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

// ================= BỘ LỌC KẾT QUẢ THI ĐÃ TRỘN =================
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

    let userAnsLetter = answers[i] ? answers[i].toString().trim().toUpperCase() : ""; 
    let userAnsText = (userAnsLetter && q.shuffledOpts) ? q.shuffledOpts[userAnsLetter].toString().trim().toLowerCase() : "";

    let ok = userAnsText !== "" && userAnsText === q.correctTextTarget;

    if (type === 'correct' && !ok) return;
    if (type === 'wrong' && ok) return;

    let qText = q.question || q.cauhoi || "Dữ liệu lỗi";
    let optA = q.shuffledOpts ? q.shuffledOpts.A : "";
    let optB = q.shuffledOpts ? q.shuffledOpts.B : "";
    let optC = q.shuffledOpts ? q.shuffledOpts.C : "";
    let optD = q.shuffledOpts ? q.shuffledOpts.D : "";

    // Tìm nhãn chữ cái (A,B,C,D) mới đang chứa chuỗi text đáp án đúng sau khi đảo vị trí
    let currentCorrectLetter = "A";
    if (optA.toString().trim().toLowerCase() === q.correctTextTarget) currentCorrectLetter = "A";
    else if (optB.toString().trim().toLowerCase() === q.correctTextTarget) currentCorrectLetter = "B";
    else if (optC.toString().trim().toLowerCase() === q.correctTextTarget) currentCorrectLetter = "C";
    else if (optD.toString().trim().toLowerCase() === q.correctTextTarget) currentCorrectLetter = "D";

    let fullCorrectText = `${currentCorrectLetter}. ${q.shuffledOpts[currentCorrectLetter]}`;
    let fullUserText = userAnsLetter ? `${userAnsLetter}. ${q.shuffledOpts[userAnsLetter]}` : "Không lựa chọn đáp án (Bỏ trống câu này)";

    html += `
      <div style="margin-bottom: 24px; text-align: justify; line-height: 1.5; font-size: 15px; color: #111;">
        <p style="margin: 0 0 6px 0; padding: 0; white-space: pre-wrap;"><b>Câu ${i + 1}.</b> ${qText}</p>
        <div style="margin: 0 0 6px 0; padding-left: 15px; font-size: 14.5px; color: #333;">
          <div style="margin-bottom: 3px;">
            <span style="color: #666;">- Phương án đã chọn:</span> ${fullUserText} 
            <span style="display: inline-block; padding: 1px 6px; font-size: 11px; font-family: 'Times New Roman'; font-weight: bold; border-radius: 3px; margin-left: 8px; background-color: ${userAnsLetter === "" ? '#f1f3f5' : (ok ? '#e8f5e9' : '#ffebee')}; color: ${userAnsLetter === "" ? '#555' : (ok ? '#2e7d32' : '#c62828')};">${userAnsLetter === "" ? "CHƯA LÀM" : (ok ? "CHÍNH XÁC" : "KHÔNG ĐÚNG")}</span>
          </div>
          ${!ok ? `<div style="margin-bottom: 3px;"><span style="color: #666;">- Đáp án đúng:</span> <b style="color: #2e7d32;">${fullCorrectText}</b></div>` : ""}
        </div>
        <div style="margin: 6px 0 0 15px; padding: 4px 0 4px 10px; font-style: italic; font-size: 14px; color: #555; border-left: 2px solid #e0e0e0; white-space: pre-wrap;">
          <b>Cơ sở lý luận (Giải thích):</b> ${q.explanation ? q.explanation : (q.giảithích ? q.giảithích : "Chưa có nội dung giải thích.")}
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html || `<p style='text-align:center; color:#777; font-style: italic; padding: 20px;'>Không tìm thấy dữ liệu thích hợp.</p>`;
}

// ================= BẢO MẬT CHỐNG SAO CHÉP ĐỀ THI =================
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

  window.addEventListener('blur', function() { if (app) app.style.filter = "blur(15px)"; });
  window.addEventListener('focus', function() { if (app) app.style.filter = "none"; });
}
