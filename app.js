/**
 * AIR QUALITY MONITOR – DASHBOARD CONTROLLER
 * Kết nối ThingSpeak API | Chart.js | Điều khiển Từ xa | Cảnh báo
 * ThingSpeak Channel: 3551578
 *   Field 1: Nhiệt độ (°C)
 *   Field 2: Độ ẩm (%)
 *   Field 3: Khói/Gas (ADC 0-4095)
 *   Field 4: Mức chất lượng (0=Tốt, 1=Trung bình, 2=Nguy hiểm)
 *   Field 5: Lệnh điều khiển (0=Auto, 1=Bật còi, 2=Tắt còi)
 */

// ======================== CẤU HÌNH ========================
const DEFAULTS = {
  channelId: '3551578',
  writeKey: 'CE712UCBEPI28WOA',
  readKey: '',
  syncInterval: 5,
  gasThreshold: 2500
};

const state = {
  cfg: { ...DEFAULTS },
  temp: 0, humi: 0, gas: 0,
  aqiLevel: -1,        // -1=chưa có, 0=Tốt, 1=TB, 2=Nguy hiểm
  mode: 0,             // 0=Auto, 1=Bật còi, 2=Tắt còi
  buzzerOn: false,
  prevAqi: -1,
  soundOn: true,
  pushOn: false,
  chart: null,
  timer: null,
  sending: false
};

// ======================== AUDIO ========================
let audioCtx = null;
function beep(freq = 880, dur = 0.25, type = 'triangle') {
  if (!state.soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(0.18, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (_) { /* ignore */ }
}

// ======================== CẤU HÌNH LƯU TRỮ ========================
function loadConfig() {
  const s = localStorage.getItem('aq_monitor_cfg');
  if (s) {
    try { Object.assign(state.cfg, JSON.parse(s)); } catch (_) {}
  }
  document.getElementById('cfgChannel').value = state.cfg.channelId;
  document.getElementById('cfgWriteKey').value = state.cfg.writeKey;
  document.getElementById('cfgReadKey').value = state.cfg.readKey;
  document.getElementById('cfgInterval').value = state.cfg.syncInterval;
  document.getElementById('threshSlider').value = state.cfg.gasThreshold;
  document.getElementById('threshDisplay').textContent = state.cfg.gasThreshold;
}

function saveConfig() {
  state.cfg.channelId = document.getElementById('cfgChannel').value.trim();
  state.cfg.writeKey = document.getElementById('cfgWriteKey').value.trim();
  state.cfg.readKey = document.getElementById('cfgReadKey').value.trim();
  state.cfg.syncInterval = Math.max(3, parseInt(document.getElementById('cfgInterval').value) || 5);
  localStorage.setItem('aq_monitor_cfg', JSON.stringify(state.cfg));
  restartSync();
  addLog('Cấu hình đã cập nhật', '--', '--', '--', '--');
}

// ======================== GAUGE HELPERS ========================
const CIRC = 314; // 2 * PI * 50

function setGauge(id, value, max) {
  const el = document.getElementById(id);
  const ratio = Math.min(1, Math.max(0, value / max));
  el.style.strokeDashoffset = CIRC - CIRC * ratio;
}

function colorGasGauge(val) {
  const el = document.getElementById('gaugeGas');
  if (val < 1500) { el.style.stroke = '#34d399'; el.style.filter = 'drop-shadow(0 0 6px rgba(52,211,153,.4))'; }
  else if (val < state.cfg.gasThreshold) { el.style.stroke = '#fbbf24'; el.style.filter = 'drop-shadow(0 0 6px rgba(251,191,36,.4))'; }
  else { el.style.stroke = '#f87171'; el.style.filter = 'drop-shadow(0 0 6px rgba(248,113,113,.4))'; }
}

// ======================== UI UPDATE ========================
function updateTempUI(v) {
  state.temp = v;
  document.getElementById('tempValue').textContent = v.toFixed(1);
  setGauge('gaugeTemp', v, 50); // 0-50°C range
  let status = 'Bình thường';
  if (v > 35) status = '⚠ Quá nóng!';
  else if (v > 30) status = 'Hơi nóng';
  else if (v < 15) status = 'Lạnh';
  document.getElementById('tempStatus').textContent = status;
}

function updateHumiUI(v) {
  state.humi = v;
  document.getElementById('humiValue').textContent = v.toFixed(1);
  setGauge('gaugeHumi', v, 100);
  let status = 'Bình thường';
  if (v > 85) status = '⚠ Quá ẩm!';
  else if (v > 70) status = 'Hơi ẩm';
  else if (v < 30) status = 'Khô';
  document.getElementById('humiStatus').textContent = status;
}

function updateGasUI(v) {
  state.gas = v;
  document.getElementById('gasValue').textContent = v;
  setGauge('gaugeGas', v, 4095);
  colorGasGauge(v);
  document.getElementById('gasBarFill').style.width = ((v / 4095) * 100) + '%';
  let status = 'Sạch (An toàn)';
  if (v >= state.cfg.gasThreshold) status = '🚨 NGUY HIỂM!';
  else if (v >= 1500) status = '⚠ Ô nhiễm nhẹ';
  document.getElementById('gasStatus').textContent = status;
}

function updateAqiUI(level) {
  const changed = state.aqiLevel !== level;
  state.aqiLevel = level;

  const card = document.getElementById('cardAqi');
  const display = document.getElementById('aqiDisplay');
  const icon = document.getElementById('aqiIcon');
  const label = document.getElementById('aqiLabel');
  const sub = document.getElementById('aqiSub');

  display.classList.remove('aqi-good', 'aqi-moderate', 'aqi-danger');

  if (level === 0) {
    display.classList.add('aqi-good');
    icon.className = 'fa-solid fa-shield-heart aqi-icon';
    label.textContent = 'KHÔNG KHÍ TỐT';
    sub.textContent = 'Chất lượng không khí trong phòng đạt mức an toàn';
    state.buzzerOn = false;
  } else if (level === 1) {
    display.classList.add('aqi-moderate');
    icon.className = 'fa-solid fa-exclamation-triangle aqi-icon';
    label.textContent = 'Ô NHIỄM NHẸ';
    sub.textContent = 'Nồng độ khói/gas tăng nhẹ, cần theo dõi';
    state.buzzerOn = false;
  } else {
    display.classList.add('aqi-danger');
    icon.className = 'fa-solid fa-skull-crossbones aqi-icon';
    label.textContent = '⚠ NGUY HIỂM';
    sub.textContent = 'Phát hiện khói/gas nồng độ cao! Còi cảnh báo đã kích hoạt';
    state.buzzerOn = true;
  }

  document.getElementById('buzzerStateText').textContent = state.buzzerOn ? 'ĐANG KÊU' : 'Tắt';
  document.getElementById('modeStateText').textContent =
    state.mode === 0 ? 'Tự động' : (state.mode === 1 ? 'Bật còi cưỡng bức' : 'Tắt còi cưỡng bức');

  if (changed && state.prevAqi >= 0) {
    if (level === 2) {
      showAlert('🚨 CẢNH BÁO KHẨN CẤP:', 'Phát hiện khói/gas nồng độ cao trong phòng học! Còi cảnh báo đã kích hoạt.');
      beep(1200, 0.5, 'sawtooth');
      pushNotify('NGUY HIỂM - Khói/Gas!', 'Phát hiện nồng độ khói vượt ngưỡng an toàn trong phòng học!');
    } else if (level === 1 && state.prevAqi !== 1) {
      showAlert('Lưu ý:', 'Nồng độ khói/gas tăng nhẹ. Hệ thống đang theo dõi.');
      beep(800, 0.2);
    } else if (level === 0 && state.prevAqi > 0) {
      showAlert('Thông báo:', 'Chất lượng không khí đã trở về mức AN TOÀN.');
      beep(523, 0.15, 'sine');
    }
  }
  state.prevAqi = level;
}

function setMode(m) {
  state.mode = m;
  const autoBtn = document.getElementById('btnAuto');
  const manBtn = document.getElementById('btnManual');
  const badge = document.getElementById('modeBadge');

  if (m === 0) {
    autoBtn.classList.add('active'); manBtn.classList.remove('active');
    badge.textContent = 'AUTO'; badge.className = 'tag tag-mode';
  } else {
    autoBtn.classList.remove('active'); manBtn.classList.add('active');
    badge.textContent = 'MANUAL'; badge.className = 'tag tag-orange';
  }
  document.getElementById('modeStateText').textContent =
    m === 0 ? 'Tự động' : (m === 1 ? 'Bật còi cưỡng bức' : 'Tắt còi cưỡng bức');
}

function updateTimestamps(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const t = d.toLocaleTimeString('vi-VN');
  document.getElementById('tempTime').textContent = t;
  document.getElementById('humiTime').textContent = t;
  document.getElementById('gasTime').textContent = t;
}

// ======================== ALERT & NOTIFICATION ========================
function showAlert(heading, msg) {
  const strip = document.getElementById('alertStrip');
  document.getElementById('alertHeading').textContent = heading;
  document.getElementById('alertMsg').textContent = msg;
  strip.classList.remove('hidden');
  clearTimeout(strip._t);
  strip._t = setTimeout(() => strip.classList.add('hidden'), 7000);
}

function pushNotify(title, body) {
  if (state.pushOn && Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/4380/4380661.png' });
  }
}

// ======================== EVENT LOG ========================
function addLog(event, temp, humi, gas, quality) {
  const tbody = document.getElementById('logBody');
  const tr = document.createElement('tr');
  const now = new Date().toLocaleTimeString('vi-VN');

  const qBadge = quality === 0 ? '<span class="tag tag-cyan" style="font-size:.72rem">Tốt</span>'
    : quality === 1 ? '<span class="tag tag-orange" style="font-size:.72rem">TB</span>'
    : quality === 2 ? '<span class="tag" style="font-size:.72rem;background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.3)">Nguy hiểm</span>'
    : quality;

  tr.innerHTML = `
    <td class="mono" style="color:var(--text-2)">${now}</td>
    <td><strong>${event}</strong></td>
    <td class="mono">${temp}</td>
    <td class="mono">${humi}</td>
    <td class="mono">${gas}</td>
    <td>${qBadge}</td>`;
  tbody.insertBefore(tr, tbody.firstChild);
  while (tbody.children.length > 50) tbody.removeChild(tbody.lastChild);
}

// ======================== CHART.JS ========================
function initChart() {
  const ctx = document.getElementById('mainChart').getContext('2d');

  const gradTemp = ctx.createLinearGradient(0, 0, 0, 280);
  gradTemp.addColorStop(0, 'rgba(34,211,238,.3)');
  gradTemp.addColorStop(1, 'rgba(34,211,238,0)');

  const gradHumi = ctx.createLinearGradient(0, 0, 0, 280);
  gradHumi.addColorStop(0, 'rgba(96,165,250,.25)');
  gradHumi.addColorStop(1, 'rgba(96,165,250,0)');

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Nhiệt độ (°C)',
          data: [], borderColor: '#22d3ee', backgroundColor: gradTemp,
          borderWidth: 2.5, fill: true, tension: .35, yAxisID: 'yLeft',
          pointRadius: 2, pointHoverRadius: 5
        },
        {
          label: 'Độ ẩm (%)',
          data: [], borderColor: '#60a5fa', backgroundColor: gradHumi,
          borderWidth: 2, fill: true, tension: .35, yAxisID: 'yLeft',
          pointRadius: 2, pointHoverRadius: 5
        },
        {
          label: 'Khói/Gas (ADC)',
          data: [], borderColor: '#fbbf24', backgroundColor: 'transparent',
          borderWidth: 2.5, fill: false, tension: .35, yAxisID: 'yRight',
          pointRadius: 2, pointHoverRadius: 5
        },
        {
          label: 'Ngưỡng Nguy hiểm',
          data: [], borderColor: '#f97316', borderWidth: 1.5,
          borderDash: [6, 4], fill: false, pointRadius: 0, yAxisID: 'yRight'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a', titleColor: '#f1f5f9', bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,.1)', borderWidth: 1, padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
        },
        yLeft: {
          type: 'linear', position: 'left', min: 0, max: 100,
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#22d3ee', font: { family: 'JetBrains Mono', size: 10 } },
          title: { display: true, text: '°C / %', color: '#22d3ee' }
        },
        yRight: {
          type: 'linear', position: 'right', min: 0, max: 4095,
          grid: { drawOnChartArea: false },
          ticks: { color: '#fbbf24', font: { family: 'JetBrains Mono', size: 10 } },
          title: { display: true, text: 'Gas ADC', color: '#fbbf24' }
        }
      }
    }
  });
}

// ======================== THINGSPEAK FETCH ========================
async function fetchData() {
  const { channelId, readKey } = state.cfg;
  let url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=20`;
  if (readKey) url += `&api_key=${readKey}`;

  const dot = document.getElementById('connDot');
  const lbl = document.getElementById('connLabel');

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    dot.className = 'conn-dot online';
    lbl.textContent = 'Đã kết nối Cloud';

    if (data.feeds && data.feeds.length > 0) {
      processFeeds(data.feeds);
    }
  } catch (err) {
    console.warn('Fetch error:', err);
    dot.className = 'conn-dot offline';
    lbl.textContent = 'Mất kết nối (Mô phỏng)';
    simulateData();
  }
}

function processFeeds(feeds) {
  // Tìm feed mới nhất có dữ liệu hợp lệ cho từng field
  let fTemp = null, fHumi = null, fGas = null, fAqi = null, fMode = null;

  for (let i = feeds.length - 1; i >= 0; i--) {
    const f = feeds[i];
    if (!fTemp && f.field1 != null && f.field1 !== '') fTemp = f;
    if (!fHumi && f.field2 != null && f.field2 !== '') fHumi = f;
    if (!fGas  && f.field3 != null && f.field3 !== '') fGas = f;
    if (!fAqi  && f.field4 != null && f.field4 !== '') fAqi = f;
    if (!fMode && f.field5 != null && f.field5 !== '') fMode = f;
  }

  const temp = fTemp ? parseFloat(fTemp.field1) : state.temp;
  const humi = fHumi ? parseFloat(fHumi.field2) : state.humi;
  const gas  = fGas  ? parseInt(fGas.field3) : state.gas;
  let aqi = fAqi ? parseInt(fAqi.field4) : -1;

  // Tính AQI từ gas nếu field4 chưa có
  if (aqi < 0) {
    if (gas < 1500) aqi = 0;
    else if (gas < state.cfg.gasThreshold) aqi = 1;
    else aqi = 2;
  }

  if (fMode) {
    const m = parseInt(fMode.field5);
    if (m !== state.mode) setMode(m === 0 ? 0 : m);
  }

  updateTempUI(temp);
  updateHumiUI(humi);
  updateGasUI(gas);
  updateAqiUI(aqi);

  const lastTs = (fTemp || feeds[feeds.length - 1]).created_at;
  updateTimestamps(lastTs);

  // Cập nhật Chart.js
  if (state.chart) {
    let runTemp = temp, runHumi = humi, runGas = gas;
    const labels = [], dTemp = [], dHumi = [], dGas = [], dThresh = [];

    feeds.forEach(f => {
      const d = new Date(f.created_at);
      labels.push(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`);

      if (f.field1 != null && f.field1 !== '') runTemp = parseFloat(f.field1);
      if (f.field2 != null && f.field2 !== '') runHumi = parseFloat(f.field2);
      if (f.field3 != null && f.field3 !== '') runGas = parseInt(f.field3);

      dTemp.push(runTemp);
      dHumi.push(runHumi);
      dGas.push(runGas);
      dThresh.push(state.cfg.gasThreshold);
    });

    state.chart.data.labels = labels;
    state.chart.data.datasets[0].data = dTemp;
    state.chart.data.datasets[1].data = dHumi;
    state.chart.data.datasets[2].data = dGas;
    state.chart.data.datasets[3].data = dThresh;
    state.chart.update('none');
  }
}

// Mô phỏng khi không có internet
let mockGas = 800;
function simulateData() {
  const jitter = (Math.random() - 0.5);
  const temp = 25 + jitter * 6;
  const humi = 60 + jitter * 20;
  mockGas = Math.round(Math.min(4000, Math.max(100, mockGas + (Math.random() - 0.5) * 400)));

  let aqi = 0;
  if (mockGas >= state.cfg.gasThreshold) aqi = 2;
  else if (mockGas >= 1500) aqi = 1;

  updateTempUI(temp);
  updateHumiUI(humi);
  updateGasUI(mockGas);
  updateAqiUI(aqi);
  updateTimestamps();

  if (state.chart) {
    const now = new Date();
    const label = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    const c = state.chart;
    if (c.data.labels.length > 20) {
      c.data.labels.shift();
      c.data.datasets.forEach(ds => ds.data.shift());
    }
    c.data.labels.push(label);
    c.data.datasets[0].data.push(temp);
    c.data.datasets[1].data.push(humi);
    c.data.datasets[2].data.push(mockGas);
    c.data.datasets[3].data.push(state.cfg.gasThreshold);
    c.update('none');
  }
}

// ======================== SEND COMMAND ========================
async function sendCommand(field5Val, desc) {
  const { writeKey } = state.cfg;
  const fb = document.getElementById('cmdStatus');

  if (!writeKey) {
    fb.className = 'cmd-status err';
    fb.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> <span>Chưa có Write API Key!</span>';
    return;
  }
  if (state.sending) return;
  state.sending = true;

  fb.className = 'cmd-status wait';
  fb.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang gửi "${desc}"...</span>`;

  try {
    const url = `https://api.thingspeak.com/update?api_key=${writeKey}&field5=${field5Val}`;
    const res = await fetch(url);
    const txt = await res.text();

    if (txt && parseInt(txt) > 0) {
      fb.className = 'cmd-status ok';
      fb.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>"${desc}" thành công (Entry #${txt})</span>`;
      state.mode = field5Val;
      setMode(field5Val);
    } else {
      fb.className = 'cmd-status wait';
      fb.innerHTML = '<i class="fa-solid fa-clock"></i> <span>ThingSpeak bận (giới hạn 15s), tự động gửi lại sau 3s...</span>';
      state.sending = false;
      setTimeout(() => sendCommand(field5Val, desc), 3000);
      return;
    }
    addLog(desc, state.temp.toFixed(1), state.humi.toFixed(1), state.gas, state.aqiLevel);
  } catch (_) {
    fb.className = 'cmd-status ok';
    fb.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>"${desc}" đã thực hiện cục bộ</span>`;
    addLog(desc, state.temp.toFixed(1), state.humi.toFixed(1), state.gas, state.aqiLevel);
  } finally {
    state.sending = false;
  }
}

// ======================== SYNC LOOP ========================
function restartSync() {
  if (state.timer) clearInterval(state.timer);
  fetchData();
  state.timer = setInterval(() => {
    if (document.getElementById('toggleAutoSync').checked) fetchData();
  }, (state.cfg.syncInterval || 5) * 1000);
}

// ======================== EVENT LISTENERS ========================
function setupEvents() {
  // Mode buttons
  document.getElementById('btnAuto').addEventListener('click', () => {
    setMode(0);
    sendCommand(0, 'Chuyển chế độ Tự động (AUTO)');
    // Tính lại AQI
    let aqi = 0;
    if (state.gas >= state.cfg.gasThreshold) aqi = 2;
    else if (state.gas >= 1500) aqi = 1;
    updateAqiUI(aqi);
  });

  document.getElementById('btnManual').addEventListener('click', () => {
    setMode(1);
    showAlert('Chế độ Thủ công:', 'Bạn toàn quyền bật/tắt còi cảnh báo.');
  });

  // Buzzer force buttons
  document.getElementById('btnBuzzerOn').addEventListener('click', () => {
    setMode(1);
    state.buzzerOn = true;
    document.getElementById('buzzerStateText').textContent = 'ĐANG KÊU';
    sendCommand(1, 'BẬT CÒI CƯỠNG BỨC');
  });

  document.getElementById('btnBuzzerOff').addEventListener('click', () => {
    setMode(2);
    state.buzzerOn = false;
    document.getElementById('buzzerStateText').textContent = 'Tắt';
    sendCommand(2, 'TẮT CÒI CƯỠNG BỨC');
  });

  // Threshold slider
  const slider = document.getElementById('threshSlider');
  slider.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    document.getElementById('threshDisplay').textContent = v;
    state.cfg.gasThreshold = v;

    // Cập nhật đường ngưỡng trên chart
    if (state.chart) {
      state.chart.data.datasets[3].data = state.chart.data.labels.map(() => v);
      state.chart.update('none');
    }

    // Re-evaluate AQI locally
    if (state.mode === 0) {
      let aqi = 0;
      if (state.gas >= v) aqi = 2;
      else if (state.gas >= 1500) aqi = 1;
      updateAqiUI(aqi);
    }
  });
  slider.addEventListener('change', () => {
    localStorage.setItem('aq_monitor_cfg', JSON.stringify(state.cfg));
    addLog(`Đổi ngưỡng: ${state.cfg.gasThreshold}`, '--', '--', '--', '--');
  });

  // Toggles
  document.getElementById('toggleSound').addEventListener('change', e => {
    state.soundOn = e.target.checked;
    if (e.target.checked) beep(880, 0.12);
  });

  document.getElementById('togglePush').addEventListener('change', e => {
    if (e.target.checked && 'Notification' in window) {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          state.pushOn = true;
          new Notification('Air Quality Monitor', { body: 'Đã bật thông báo trình duyệt!' });
        } else { e.target.checked = false; state.pushOn = false; }
      });
    } else { state.pushOn = false; }
  });

  // Refresh
  document.getElementById('btnRefresh').addEventListener('click', () => { fetchData(); beep(1200, 0.08); });

  // Clear log
  document.getElementById('btnClearLog').addEventListener('click', () => {
    document.getElementById('logBody').innerHTML = '';
  });

  // Alert dismiss
  document.getElementById('dismissAlertBtn').addEventListener('click', () => {
    document.getElementById('alertStrip').classList.add('hidden');
  });

  // Modal
  const overlay = document.getElementById('settingsOverlay');
  document.getElementById('openSettingsBtn').addEventListener('click', () => overlay.classList.remove('hidden'));
  document.getElementById('closeModalBtn').addEventListener('click', () => overlay.classList.add('hidden'));
  document.getElementById('cancelModalBtn').addEventListener('click', () => overlay.classList.add('hidden'));
  document.getElementById('saveModalBtn').addEventListener('click', () => {
    saveConfig();
    overlay.classList.add('hidden');
    showAlert('Thành công!', 'Đã lưu cấu hình và kết nối lại ThingSpeak.');
  });
}

// ======================== INIT ========================
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  initChart();
  setupEvents();
  restartSync();
  addLog('Hệ thống khởi động', '--', '--', '--', '--');
});
