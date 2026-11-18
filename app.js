(function () {
  let questions = [];
  let gradedResults = [];
  let totalAllowedInStore = 0;

  let index = 0;
  let answers = {};
  let timer;
  let inactivityChecker;
  let time = 60 * 60;
  let currentFilter = 'all';
  let isProtectionEnabled = false;

  const app = document.getElementById("app");
  const FIREBASE_URL = "https://thi-trac-nghiem-ce1d4-default-rtdb.asia-southeast1.firebasedatabase.app";
  const API_URL = "/api/exam";
  const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000;

  function getDeviceId() {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("deviceId", id);
    }
    return id;
  }

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
    ["click", "keydown", "touchstart"].forEach(evt => {
      window.removeEventListener(evt, updateLastActivity);
      window.addEventListener(evt, updateLastActivity, { passive: true });
    });

    inactivityChecker = setInterval(() => {
      if (localStorage.getItem("user") && isSessionExpiredByInactivity()) {
        forceLogoutDueToInactivity();
      }
    }, 60 * 1000);
  }

  // ================= ĐĂNG XUẤT CHỦ ĐỘNG =================
  window.logout = function () {
    if (!confirm("Bạn có chắc chắn muốn thoát đăng nhập không?")) return;
    clearInterval(timer);
    clearInterval(inactivityChecker);
    localStorage.removeItem("user");
    localStorage.removeItem("lastActiveTime");
    document.body.style.backgroundColor = "";
    document.body.style.padding = "";
    showLogin();
  };

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

  // ================= XỬ LÝ ĐĂNG NHẬP + LẤY ĐỀ 1 LẦN DUY NHẤT =================
  window.login = async function () {
    let u = document.getElementById("u").value.trim();
    let p = document.getElementById("p").value.trim();
    if (!u || !p) return alert("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");

    let btn = document.getElementById("btnLogin");
    if (btn) {
      btn.innerText = "Đang vào thi...";
      btn.disabled = true;
    }

    try {
      let deviceId = getDeviceId();
      const key = safeKey(u);
      const savedStats = JSON.parse(localStorage.getItem("userStats") || "{}");
      const correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

      const [authRes, fbRes] = await Promise.all([
        fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "login",
            username: u,
            password: p,
            userStats: savedStats,
            correctPool: correctPool
          })
        }),
        fetch(`${FIREBASE_URL}/sessions/${key}.json`).catch(() => null)
      ]);

      const data = await authRes.json();

      if (!authRes.ok) {
        if (btn) { btn.innerText = "Đăng nhập"; btn.disabled = false; }
        return alert(data.error || "Sai tài khoản hoặc mật khẩu!");
      }

      const user = data.user;

      if (user.role !== "admin" && fbRes) {
        const remoteSession = await fbRes.json();

        if (remoteSession && remoteSession.isLocked) {
          if (btn) { btn.innerText = "Đăng nhập"; btn.disabled = false; }
          return alert("TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN do đăng nhập trên thiết bị khác. Vui lòng liên hệ Admin!");
        }

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

        fetch(`${FIREBASE_URL}/sessions/${key}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            deviceId: deviceId,
            isLocked: false,
            lastLogin: new Date().toLocaleString("vi-VN")
          })
        });
      }

      localStorage.setItem("user", JSON.stringify(user));
      updateLastActivity();
      startInactivityWatcher();

      document.getElementById("loginBox").style.display = "none";
      if (app) app.style.display = "block";
      enableProtectionForSubAccounts();

      if (data.resetPool) {
        localStorage.removeItem("correctPool");
        localStorage.removeItem("userStats");
      }

      questions = data.questions || [];
      totalAllowedInStore = data.totalAllowedCount || questions.length;
      answers = {};
      index = 0;
      time = 60 * 60;

      if (user.role === "admin" && data.adminReport) {
        console.log(`%c📊 BÁO CÁO PHÂN BỔ ĐỀ THI (${questions.length} CÂU)`, "color: #00796b; font-weight: bold; font-size: 14px;");
        console.table(data.adminReport);
      }

      render();
      startTimer();
    } catch (err) {
      if (btn) { btn.innerText = "Đăng nhập"; btn.disabled = false; }
      alert("Lỗi kết nối máy chủ! Vui lòng kiểm tra lại mạng.");
    }
  };

  // ================= KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP =================
  async function checkLogin() {
    let user = JSON.parse(localStorage.getItem("user"));
    let deviceId = getDeviceId();

    if (!user) {
      showLogin();
      return;
    }

    if (isSessionExpiredByInactivity()) {
      localStorage.removeItem("user");
      localStorage.removeItem("lastActiveTime");
      alert("⏰ Bạn đã không làm bài hơn 12 giờ. Vui lòng đăng nhập lại!");
      showLogin();
      return;
    }

    updateLastActivity();
    startInactivityWatcher();

    document.getElementById("loginBox").style.display = "none";
    if (app) app.style.display = "block";

    enableProtectionForSubAccounts();
    startExam();

    if (user.role !== "admin") {
      const key = safeKey(user.username);
      fetch(`${FIREBASE_URL}/sessions/${key}.json`)
        .then(res => res.json())
        .then(remoteSession => {
          if (!remoteSession || remoteSession.isLocked || remoteSession.deviceId !== deviceId) {
            alert("Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị khóa!");
            localStorage.removeItem("user");
            showLogin();
          }
        })
        .catch(err => console.error("Không thể đồng bộ trạng thái từ Firebase:", err));
    }
  }

  // ================= BẮT ĐẦU BÀI THI (LẤY ĐỀ TỪ SERVER) =================
  async function startExam() {
    updateLastActivity();
    answers = {};
    index = 0;
    time = 60 * 60;

    if (app) {
      app.innerHTML = `<div class="box" style="text-align:center;padding:40px;"><h3>⏳ Đang tải và trộn bộ đề thi...</h3></div>`;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const savedStats = JSON.parse(localStorage.getItem("userStats") || "{}");
    const correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          username: user.username,
          userStats: savedStats,
          correctPool: correctPool
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Lỗi tải đề thi!");
        return showLogin();
      }

      if (data.resetPool) {
        localStorage.removeItem("correctPool");
        localStorage.removeItem("userStats");
      }

      questions = data.questions || [];
      totalAllowedInStore = data.totalAllowedCount || questions.length;

      if (user.role === "admin" && data.adminReport) {
        console.log(`%c📊 BÁO CÁO PHÂN BỔ ĐỀ THI (${questions.length} CÂU)`, "color: #00796b; font-weight: bold; font-size: 14px;");
        console.table(data.adminReport);
      }

      render();
      startTimer();
    } catch (err) {
      if (app) app.innerHTML = `<div class="box"><h2>Lỗi kết nối máy chủ khi tải đề! Vui lòng làm mới trang.</h2></div>`;
    }
  }

  // ================= HIỂN THỊ CÂU HỎI VÀ ĐÁP ÁN =================
  function render() {
    if (!app) return;
    if (questions.length === 0 || !questions[index]) {
      app.innerHTML = `<div class="box"><h2>Không có dữ liệu câu hỏi! Vui lòng làm mới trang.</h2></div>`;
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    let q = questions[index];

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

        <h2 style="white-space: pre-wrap; text-align: justify;">${q.question}</h2>

        <button class="option" onclick="choose('A')">A. ${q.optionsText[0]}</button>
        <button class="option" onclick="choose('B')">B. ${q.optionsText[1]}</button>
        <button class="option" onclick="choose('C')">C. ${q.optionsText[2]}</button>
        <button class="option" onclick="choose('D')">D. ${q.optionsText[3]}</button>

        <div class="nav-control">
          <button class="nav-btn" onclick="prev()">← Câu trước</button>
          <button class="nav-btn" onclick="next()">Câu sau →</button>
        </div>

        <button id="btnSubmit" class="btn" style="margin-top:15px; background:#b30000; color:#fff;" onclick="submit(false)">NỘP BÀI THI</button>

        <div id="nav"></div>
      </div>
    `;

    highlight();
    updateBar();
    renderNav();
  }

  window.choose = function (c) {
    updateLastActivity();
    answers[index] = c;
    highlight();
    renderNav();
  };

  function highlight() {
    document.querySelectorAll(".option").forEach(b => b.classList.remove("selected"));
    let ans = answers[index];
    if (!ans) return;
    const map = { A: 0, B: 1, C: 2, D: 3 };
    let btns = document.querySelectorAll(".option");
    if (btns[map[ans]]) btns[map[ans]].classList.add("selected");
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

  window.next = function () {
    updateLastActivity();
    if (index < questions.length - 1) {
      index++;
      render();
    }
  };

  window.prev = function () {
    updateLastActivity();
    if (index > 0) {
      index--;
      render();
    }
  };

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
      if (time <= 0) {
        clearInterval(timer);
        alert("⏰ Đã hết thời gian làm bài! Hệ thống sẽ tự động nộp bài của bạn.");
        submit(true);
      }
    }, 1000);
  }

  // ================= NỘP BÀI VÀ CHẤM ĐIỂM QUA SERVER =================
  window.submit = async function (isAutoSubmit = false) {
    updateLastActivity();
    let user = JSON.parse(localStorage.getItem("user") || "{}");
    let answeredCount = Object.keys(answers).length;

    if (!isAutoSubmit) {
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
    }

    clearInterval(timer);
    const btnSub = document.getElementById("btnSubmit");
    if (btnSub) {
      btnSub.innerText = "Đang chấm điểm...";
      btnSub.disabled = true;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          username: user.username,
          answers: answers,
          questionList: questions
        })
      });

      const report = await res.json();
      if (!res.ok) {
        alert(report.error || "Lỗi khi chấm điểm!");
        return;
      }

      gradedResults = report.results || [];

      let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");
      let statsToSave = JSON.parse(localStorage.getItem("userStats") || "{}");

      gradedResults.forEach(item => {
        const qTextId = item.question.trim();
        let st = statsToSave[qTextId] || { weight: 1, correctCount: 0, wrongCount: 0 };

        if (item.isDone) {
          if (item.isCorrect) {
            st.correctCount++;
            st.weight = Math.max(1, st.weight - 0.3);
            if (!correctPool.includes(qTextId)) correctPool.push(qTextId);
          } else {
            st.wrongCount++;
            st.weight = Math.min(10, st.weight + 1.2);
            const cIdx = correctPool.indexOf(qTextId);
            if (cIdx > -1) correctPool.splice(cIdx, 1);
          }
        }
        statsToSave[qTextId] = st;
      });

      localStorage.setItem("correctPool", JSON.stringify(correctPool));
      localStorage.setItem("userStats", JSON.stringify(statsToSave));

      let totalCorrectInStore = correctPool.length;
      let totalRemainingInStore = Math.max(0, report.totalAllowedCount - totalCorrectInStore);

      document.body.style.backgroundColor = "#f4f5f7";
      document.body.style.margin = "0";
      document.body.style.padding = "20px 0";

      if (app) {
        app.innerHTML = `
          <div style="max-width: 820px; margin: 0 auto; background: #ffffff; padding: 40px 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-radius: 8px; font-family: 'Times New Roman', Times, serif;">
            <div style="text-align: right; margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-right: 4px solid #00796b;">
                <div style="color: #444; margin-bottom: 5px;">Số câu đã làm đúng: <b style="color: #00796b; font-size: 16px;">${totalCorrectInStore}</b></div>
                <div style="color: #444;">Số câu còn lại: <b style="color: #c62828; font-size: 16px;">${totalRemainingInStore}</b></div>
            </div>

            <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 10px 0; color: #111;">BÁO CÁO KẾT QUẢ KIỂM TRA</h1>
            <p style="text-align: center; font-size: 15px; color: #555; margin: 0 0 20px 0;">
              Số câu đã hoàn thành: <b>${report.submittedCount}/${questions.length}</b><br>
              Số câu đúng: <b style="color: #2e7d32;">${report.correct}</b> | Sai: <b style="color: #c62828;">${report.wrong}</b>
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
    } catch (err) {
      alert("Lỗi kết nối khi nộp bài! Vui lòng thử bấm Nộp bài lại.");
      if (btnSub) {
        btnSub.innerText = "NỘP BÀI THI";
        btnSub.disabled = false;
      }
    }
  };

  // ================= BỘ LỌC KẾT QUẢ THI =================
  window.filterResult = function (type) {
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
    gradedResults.forEach((item, i) => {
      if (type === 'correct' && !item.isCorrect) return;
      if (type === 'wrong' && (!item.isDone || item.isCorrect)) return;

      let fileTag = (isAdmin && item.fileSource) ? ` <span style="font-size: 11px; color: #888; font-style: italic; background: #eee; padding: 1px 4px; border-radius: 3px;">(${item.fileSource})</span>` : "";

      html += `
        <div style="margin-bottom: 24px; padding-bottom: 10px; border-bottom: 1px solid #eee; text-align: justify; line-height: 1.5; font-size: 15px;">
          <p style="margin: 0 0 6px 0;"><b>Câu ${i + 1}.</b> ${item.question}${fileTag}</p>
          <div style="margin: 0 0 6px 0; padding-left: 15px;">
            <div><span style="color: #666;">- Đã chọn:</span> ${item.userAnsText}
              <span style="padding: 1px 6px; font-size: 11px; font-weight: bold; border-radius: 3px; margin-left: 8px; background-color: ${!item.isDone ? '#f1f3f5' : (item.isCorrect ? '#e8f5e9' : '#ffebee')}; color: ${!item.isDone ? '#555' : (item.isCorrect ? '#2e7d32' : '#c62828')};">
                ${!item.isDone ? "CHƯA LÀM" : (item.isCorrect ? "CHÍNH XÁC" : "SAI")}
              </span>
            </div>
            ${(!item.isDone || !item.isCorrect) ? `<div><span style="color: #666;">- Đáp án đúng:</span> <b style="color: #2e7d32;">${item.correctText}</b></div>` : ""}
          </div>
          <div style="margin: 6px 0 0 15px; padding: 4px 10px; font-style: italic; font-size: 14px; color: #555; border-left: 2px solid #e0e0e0;">
            <b>Giải thích:</b> ${item.explanation}
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html || `<p style='text-align:center; color:#777; font-style: italic; padding: 20px;'>Không tìm thấy câu hỏi nào phù hợp.</p>`;
  };

  // ================= KHÓA AN TOÀN CHỐNG SAO CHÉP (CHỐNG GẮN LẶP SỰ KIỆN) =================
  function enableProtectionForSubAccounts() {
    let user = JSON.parse(localStorage.getItem("user"));
    if (user && user.role === "admin") return;
    if (isProtectionEnabled) return;
    isProtectionEnabled = true;

    document.addEventListener('contextmenu', e => { e.preventDefault(); alert("Hệ thống kiểm tra đã khóa chuột phải học viên!"); });
    document.addEventListener('selectstart', e => e.preventDefault());
    document.addEventListener('mousedown', e => { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') e.preventDefault(); });
    document.addEventListener('dragstart', e => e.preventDefault());

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    document.addEventListener('keydown', e => {
      if (e.ctrlKey && ['c', 'x', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        alert("Hành vi sao chép/tải đề đã bị ngăn chặn!");
      }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        alert("Công cụ nhà phát triển đã bị khóa!");
      }
    });

    window.addEventListener('blur', () => {
      let appEl = document.getElementById("app");
      if (appEl) appEl.style.filter = "blur(15px)";
    });
    window.addEventListener('focus', () => {
      let appEl = document.getElementById("app");
      if (appEl) appEl.style.filter = "none";
    });
  }

  enableProtectionForSubAccounts();

  // ================= XỬ LÝ LƯỚT MÀN HÌNH (SWIPE) - CHỈ ADMIN =================
  let touchstartX = 0;
  let touchendX = 0;
  document.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
  document.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") return;
    if (!document.getElementById("time") || !document.getElementById("nav")) return;
    const diff = touchstartX - touchendX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) window.next();
      else window.prev();
    }
  }, { passive: true });

  checkLogin();
})();
