/* =========================================================
   停車小幫手 — 主程式邏輯
   ========================================================= */

'use strict';

// ── 全域狀態 ──────────────────────────────────────────────
const STATE = {
  currentScreen: 'home',
  currentRecord: null,      // 目前活躍的停車記錄
  photoDataUrl: null,       // 待上傳的照片 DataURL
  deleteTarget: null,       // 待刪除的記錄 ID
  durationTimer: null,      // 計時器 ID
  gpsFix: null,             // 表單暫存的 { latitude, longitude }
  watchId: null,            // 導航模式 watchPosition id
  navMode: false,
  distanceTimer: null,      // 首頁距離輪詢
  voiceInside: false,       // 已在 30 公尺內提示過（離開後才再響）
  lastVoiceAt: 0,
  homeGeoErrorShown: false,
  navGeoErrorShown: false,
  voicesBound: false,
  distanceForId: null,      // 已顯示距離的記錄，避免刷新時閃成「計算中」
  floorPromptId: null,      // 剛存好、等樓層的紀錄 id
};

const STORE_KEY = 'parking_records';

/** 停車紀錄存在這台裝置的 localStorage。靜態站沒有 tables API。 */
function readRecords() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('readRecords', err);
    return [];
  }
}

function writeRecords(records) {
  localStorage.setItem(STORE_KEY, JSON.stringify(records));
}

function createRecord(payload) {
  const now = Date.now();
  const record = Object.assign({}, payload, {
    id: `rec-${now}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: now,
    updated_at: now,
  });
  const records = readRecords();
  records.push(record);
  writeRecords(records);
  return record;
}

function patchRecord(id, patch) {
  const records = readRecords();
  const rec = records.find(r => r.id === id);
  if (!rec) throw new Error('record not found');
  Object.assign(rec, patch, { updated_at: Date.now() });
  writeRecords(records);
  return rec;
}

function deleteRecord(id) {
  writeRecords(readRecords().filter(r => r.id !== id));
}

function isActiveRecord(r) {
  return r.is_active === true || r.is_active === 'true';
}

/** 3 → 3F，B2 / -2 → B2。空字串代表不記樓層。 */
function normalizeFloor(raw) {
  const text = String(raw || '').trim().replace(/\s+/g, '');
  if (!text) return '';
  let match = text.match(/^b(\d+)$/i);
  if (match) return 'B' + String(Number(match[1]));
  match = text.match(/^-(\d+)$/);
  if (match) return 'B' + String(Number(match[1]));
  match = text.match(/^(\d+)f?$/i);
  if (match) return String(Number(match[1])) + 'F';
  return text;
}

/** 車位編號只去前後空白，內容原樣保留。空字串代表沒填。 */
function normalizeSpot(raw) {
  return String(raw || '').trim();
}

const ARRIVAL_METERS = 30;
const VOICE_COOLDOWN_MS = 45000;
const VOICE_EXIT_METERS = 38;

// =========================================================
// 工具函式
// =========================================================

/** 顯示 Toast 訊息 */
function showToast(msg, type = 'info', duration = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), duration);
}

/** 格式化持續時間 (ms → 可讀字串) */
function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day} 天 ${hr % 24} 小時`;
  if (hr > 0) return `${hr} 小時 ${min % 60} 分鐘`;
  if (min > 0) return `${min} 分鐘`;
  return '剛剛停車';
}

/** 格式化日期時間 */
function formatDatetime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 解析座標；空值或非數字回傳 null */
function parseCoord(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasCoords(record) {
  if (!record) return false;
  return parseCoord(record.latitude) != null && parseCoord(record.longitude) != null;
}

/** 兩點球面距離（公尺） */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** 公尺 / 公里 */
function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} 公尺`;
  const km = meters / 1000;
  if (km >= 10) return `${Math.round(km)} 公里`;
  const text = km.toFixed(1).replace(/\.0$/, '');
  return `${text} 公里`;
}

function geoErrorMessage(err) {
  const code = err && err.code;
  if (code === 1) return '⚠️ 定位權限被拒絕，請允許瀏覽器使用位置';
  if (code === 2) return '⚠️ 目前無法取得位置，請確認 GPS 已開啟';
  if (code === 3) return '⚠️ 定位逾時，請再試一次';
  return '⚠️ 定位失敗，請重試';
}

function requestCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * 停車用：先要高精度。手機上 GPS 常逾時或暫時沒訊號，
 * 那時改要較快的粗略定位（可沿用一分鐘內的快取），不要直接當成儲存失敗。
 * 權限被拒不再重試。
 */
async function readParkPosition() {
  try {
    return await requestCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  } catch (err) {
    if (!err || err.code === 1) throw err;
    return await requestCurrentPosition({
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 60000,
    });
  }
}

/** 點擊外部關閉下拉選單 */
document.addEventListener('click', (e) => {
  const menu = document.getElementById('dropdown-menu');
  const btn = document.getElementById('btn-menu');
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

// =========================================================
// 畫面切換
// =========================================================

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  STATE.currentScreen = name;

  const topNav = document.getElementById('top-nav');
  const titles = {
    home: '',
    find: '找車導航',
    save: '記錄停車位置',
    history: '歷史記錄',
    stats: '使用統計',
  };
  document.getElementById('nav-title').textContent = titles[name] || '';
  document.getElementById('dropdown-menu').classList.add('hidden');

  if (name === 'home') {
    topNav.classList.add('hidden');
    stopNavMode({ silent: true });
    stopHomeDistanceUpdates();
  } else {
    topNav.classList.remove('hidden');
    if (name !== 'find') {
      stopNavMode({ silent: true });
      stopHomeDistanceUpdates();
    }
  }
}

function goBack() {
  showScreen('home');
}

/** 一鍵停車：立刻定位並寫入停車點，不進表單 */
async function parkHere() {
  if (!navigator.geolocation) {
    showToast('⚠️ 此裝置不支援定位功能', 'warning');
    return;
  }

  const btn = document.getElementById('btn-park');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('is-locating');

  let pos = null;
  try {
    pos = await readParkPosition();
  } catch (err) {
    showToast(geoErrorMessage(err), 'warning');
  }

  if (!pos) {
    btn.disabled = false;
    btn.classList.remove('is-locating');
    return;
  }

  try {
    await deactivateAll();
    const payload = {
      vehicle_type: 'car',
      license_plate: '',
      parking_lot: '',
      floor: '',
      zone: '',
      spot_number: '',
      notes: '',
      photo_url: '',
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      parked_at: Date.now(),
      is_active: true,
    };
    const saved = createRecord(payload);
    showToast('✅ 已記下目前位置', 'success');
    refreshHome();
    openFloorPrompt(saved.id);
  } catch (err) {
    console.error(err);
    showToast('❌ 儲存失敗，請重試', 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('is-locating');
  }
}

function openFloorPrompt(id) {
  STATE.floorPromptId = id;
  const input = document.getElementById('input-park-floor');
  const spotInput = document.getElementById('input-park-spot');
  input.value = '';
  if (spotInput) spotInput.value = '';
  document.getElementById('floor-modal').classList.remove('hidden');
  input.focus();
}

function closeFloorPrompt() {
  STATE.floorPromptId = null;
  const modal = document.getElementById('floor-modal');
  if (modal) modal.classList.add('hidden');
}

/** 戶外或關掉視窗：樓層與車位都不記。 */
function skipFloorPrompt() {
  const id = STATE.floorPromptId;
  if (id) {
    try {
      patchRecord(id, { floor: '', spot_number: '' });
      if (STATE.currentRecord && STATE.currentRecord.id === id) {
        STATE.currentRecord.floor = '';
        STATE.currentRecord.spot_number = '';
      }
    } catch (err) {
      console.error(err);
      showToast('❌ 儲存失敗，請重試', 'error');
      return;
    }
  }
  closeFloorPrompt();
}

function saveFloorPrompt(e) {
  if (e) e.preventDefault();
  const id = STATE.floorPromptId;
  const floor = normalizeFloor(document.getElementById('input-park-floor').value);
  const spot = normalizeSpot(document.getElementById('input-park-spot').value);
  if (!id) {
    closeFloorPrompt();
    return;
  }
  if (!floor) {
    showToast('請輸入樓層，或選戶外不用樓層', 'info');
    return;
  }
  try {
    patchRecord(id, { floor: floor, spot_number: spot });
    if (STATE.currentRecord && STATE.currentRecord.id === id) {
      STATE.currentRecord.floor = floor;
      STATE.currentRecord.spot_number = spot;
    }
    closeFloorPrompt();
    showToast(spot ? '✅ 已記下 ' + floor + '，車位 ' + spot : '✅ 已記下 ' + floor, 'success');
  } catch (err) {
    console.error(err);
    showToast('❌ 儲存失敗，請重試', 'error');
  }
}

function showNavLine(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!text) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.textContent = text;
  el.classList.remove('hidden');
}

function showNavFloor(record) {
  const floor = record && record.floor ? String(record.floor).trim() : '';
  const spot = record && record.spot_number ? String(record.spot_number).trim() : '';
  showNavLine('nav-floor', floor ? '樓層 ' + floor : '');
  showNavLine('nav-spot', spot ? '車位 ' + spot : '');
}

/** 找車：開啟已存位置、距離與語音導航 */
async function showFind() {
  showScreen('find');
  await refreshHome();
  if (STATE.currentScreen !== 'find') return;
  if (!STATE.currentRecord) {
    showToast('尚未記錄停車位置', 'info');
    return;
  }
  if (hasCoords(STATE.currentRecord)) startNavMode();
  else showToast('⚠️ 這筆紀錄沒有 GPS 座標', 'warning');
}

function showSaveScreen() {
  resetForm();
  showScreen('save');
}

function showHistory() {
  showScreen('history');
  loadHistory();
}

function showStats() {
  showScreen('stats');
  loadStats();
}

function toggleMenu() {
  document.getElementById('dropdown-menu').classList.toggle('hidden');
}

// =========================================================
// 首頁刷新
// =========================================================

async function refreshHome() {
  try {
    const prevId = STATE.currentRecord && STATE.currentRecord.id;
    const active = readRecords().find(isActiveRecord) || null;
    STATE.currentRecord = active || null;

    if (STATE.navMode && (!active || active.id !== prevId)) {
      stopNavMode({ silent: true });
    }

    if (active) {
      renderCurrentCard(active);
      startDurationTimer(active.parked_at);
      startHomeDistanceUpdates();
    } else {
      showPlaceholder();
      stopDurationTimer();
      stopHomeDistanceUpdates();
    }
  } catch (e) {
    console.error(e);
    showPlaceholder();
    stopHomeDistanceUpdates();
  }
}

function showPlaceholder() {
  document.getElementById('no-car-placeholder').classList.remove('hidden');
  document.getElementById('current-car-card').classList.add('hidden');
  const row = document.getElementById('card-distance-row');
  if (row) row.classList.add('hidden');
}

function renderCurrentCard(r) {
  document.getElementById('no-car-placeholder').classList.add('hidden');
  document.getElementById('current-car-card').classList.remove('hidden');

  // 車輛圖示
  const badge = document.getElementById('card-vehicle-badge');
  badge.innerHTML = r.vehicle_type === 'motorcycle'
    ? '<i class="fas fa-motorcycle"></i>'
    : '<i class="fas fa-car"></i>';

  document.getElementById('card-plate').textContent = r.license_plate || (hasCoords(r) ? '已記錄位置' : '未填寫');
  setCardInfo('card-lot', r.parking_lot);
  setCardInfo('card-floor', r.floor);
  setCardInfo('card-zone', r.zone);
  setCardInfo('card-spot', r.spot_number);
  const infoGrid = document.querySelector('#current-car-card .card-info-grid');
  if (infoGrid) {
    const anyInfo = [...infoGrid.querySelectorAll('.info-item')].some(el => !el.classList.contains('hidden'));
    infoGrid.classList.toggle('hidden', !anyInfo);
  }
  document.getElementById('card-parked-at').textContent = r.parked_at ? formatDatetime(r.parked_at) : '';

  // 備註
  const notesRow = document.getElementById('card-notes-row');
  if (r.notes) {
    notesRow.classList.remove('hidden');
    document.getElementById('card-notes').textContent = r.notes;
  } else {
    notesRow.classList.add('hidden');
  }

  // 照片
  const photoRow = document.getElementById('card-photo-row');
  if (r.photo_url) {
    photoRow.classList.remove('hidden');
    document.getElementById('card-photo').src = r.photo_url;
  } else {
    photoRow.classList.add('hidden');
  }

  // 距離：沒有座標就隱藏；導航模式進行中不要把即時數字蓋成「計算中」
  const distanceRow = document.getElementById('card-distance-row');
  if (hasCoords(r)) {
    distanceRow.classList.remove('hidden');
    if (!STATE.navMode && STATE.distanceForId !== r.id) {
      document.getElementById('card-distance').textContent = '計算中...';
      STATE.distanceForId = r.id;
    }
  } else {
    distanceRow.classList.add('hidden');
    STATE.distanceForId = null;
  }
}

function setCardInfo(id, value) {
  const el = document.getElementById(id);
  const item = el.closest('.info-item');
  const text = value ? String(value).trim() : '';
  el.textContent = text || '—';
  item.classList.toggle('hidden', !text);
}

function startDurationTimer(parkedAt) {
  stopDurationTimer();
  const el = document.getElementById('card-duration');
  function tick() {
    if (!parkedAt) { el.textContent = '未知'; return; }
    el.textContent = formatDuration(Date.now() - Number(parkedAt));
  }
  tick();
  STATE.durationTimer = setInterval(tick, 10000);
}

function stopDurationTimer() {
  if (STATE.durationTimer) {
    clearInterval(STATE.durationTimer);
    STATE.durationTimer = null;
  }
}

// =========================================================
// 表單 — 記錄停車
// =========================================================

function resetForm() {
  document.getElementById('save-form').reset();
  document.getElementById('input-vehicle-type').value = 'car';
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.toggle-btn[data-value="car"]').classList.add('active');
  STATE.photoDataUrl = null;
  STATE.gpsFix = null;
  document.getElementById('photo-preview-wrap').classList.add('hidden');
  document.getElementById('photo-upload-area').classList.remove('hidden');
  const gpsStatus = document.getElementById('gps-status');
  gpsStatus.textContent = '';
  gpsStatus.classList.add('hidden');
  const gpsBtn = document.getElementById('btn-get-location');
  gpsBtn.disabled = false;
  gpsBtn.classList.remove('is-ready');
  gpsBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> 取得目前位置';
}

/** 取得目前位置，暫存緯度 / 經度，儲存時一併寫入 */
function captureLocation() {
  if (!navigator.geolocation) {
    showToast('⚠️ 此裝置不支援定位功能', 'warning');
    return;
  }

  const btn = document.getElementById('btn-get-location');
  btn.disabled = true;
  btn.classList.remove('is-ready');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 定位中...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      STATE.gpsFix = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      const status = document.getElementById('gps-status');
      status.textContent = `已記錄 ${STATE.gpsFix.latitude.toFixed(6)}, ${STATE.gpsFix.longitude.toFixed(6)}`;
      status.classList.remove('hidden');
      btn.disabled = false;
      btn.classList.add('is-ready');
      btn.innerHTML = '<i class="fas fa-check"></i> 已取得位置';
      showToast('📍 已記錄目前位置', 'success');
    },
    (err) => {
      btn.disabled = false;
      if (STATE.gpsFix) {
        btn.classList.add('is-ready');
        btn.innerHTML = '<i class="fas fa-check"></i> 已取得位置';
      } else {
        btn.innerHTML = '<i class="fas fa-location-crosshairs"></i> 取得目前位置';
      }
      showToast(geoErrorMessage(err), 'warning');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function selectVehicleType(val, btn) {
  document.getElementById('input-vehicle-type').value = val;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function triggerCamera() {
  document.getElementById('input-photo').click();
}

function previewPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    STATE.photoDataUrl = ev.target.result;
    document.getElementById('photo-preview').src = ev.target.result;
    document.getElementById('photo-preview-wrap').classList.remove('hidden');
    document.getElementById('photo-upload-area').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  STATE.photoDataUrl = null;
  document.getElementById('input-photo').value = '';
  document.getElementById('photo-preview-wrap').classList.add('hidden');
  document.getElementById('photo-upload-area').classList.remove('hidden');
}

async function saveRecord(e) {
  e.preventDefault();

  const plate = document.getElementById('input-plate').value.trim();
  if (!plate) {
    showToast('⚠️ 請填寫車牌號碼', 'warning');
    document.getElementById('input-plate').focus();
    return;
  }

  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 儲存中...';

  try {
    // 先將既有 active 記錄設為 inactive
    await deactivateAll();

    const payload = {
      vehicle_type:  document.getElementById('input-vehicle-type').value,
      license_plate: plate.toUpperCase(),
      parking_lot:   document.getElementById('input-lot').value.trim(),
      floor:         document.getElementById('input-floor').value.trim(),
      zone:          document.getElementById('input-zone').value.trim(),
      spot_number:   document.getElementById('input-spot').value.trim(),
      notes:         document.getElementById('input-notes').value.trim(),
      photo_url:     STATE.photoDataUrl || '',
      latitude:      STATE.gpsFix ? STATE.gpsFix.latitude : null,
      longitude:     STATE.gpsFix ? STATE.gpsFix.longitude : null,
      parked_at:     Date.now(),
      is_active:     true,
    };

    createRecord(payload);

    showToast('✅ 停車位置已儲存！', 'success');
    showScreen('home');
    refreshHome();

  } catch (err) {
    console.error(err);
    showToast('❌ 儲存失敗，請重試', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> 儲存停車位置';
  }
}

/** 將所有 active 記錄改為 inactive */
function deactivateAll() {
  try {
    const records = readRecords();
    let changed = false;
    const now = Date.now();
    records.forEach(r => {
      if (!isActiveRecord(r)) return;
      r.is_active = false;
      r.updated_at = now;
      changed = true;
    });
    if (changed) writeRecords(records);
  } catch (e) { console.warn('deactivateAll error', e); }
}

// =========================================================
// 找到車了！
// =========================================================

function confirmFound() {
  document.getElementById('found-modal').classList.remove('hidden');
}
function closeFoundModal() {
  document.getElementById('found-modal').classList.add('hidden');
}

async function markFound() {
  closeFoundModal();
  if (!STATE.currentRecord) return;
  try {
    patchRecord(STATE.currentRecord.id, { is_active: false });
    showToast('🎉 太好了！希望您行車平安！', 'success', 3500);
    stopNavMode({ silent: true });
    STATE.currentRecord = null;
    showPlaceholder();
    stopDurationTimer();
    stopHomeDistanceUpdates();
  } catch(e) {
    showToast('❌ 更新失敗', 'error');
  }
}

// =========================================================
// 導航功能
// =========================================================

function mapPlatform(ua) {
  const text = ua == null ? navigator.userAgent : String(ua);
  if (/iPad|iPhone|iPod/.test(text)) return 'ios';
  if (/Android/.test(text)) return 'android';
  return 'web';
}

/**
 * 外部地圖一律步行。
 * iOS Apple Maps：dirflg=w
 * Android Google 導航：mode=w
 * 網頁 Google Maps：travelmode=walking
 */
function buildWalkingNavUrl(lat, lng, label, platform) {
  const hasCoords = lat != null && lng != null && lat !== '' && lng !== '';
  const name = label && String(label).trim() ? String(label).trim() : '定位點';
  const encoded = encodeURIComponent(name);
  if (platform === 'ios') {
    if (hasCoords) return `maps://?daddr=${lat},${lng}&q=${encoded}&dirflg=w`;
    return `maps://?daddr=${encoded}&dirflg=w`;
  }
  if (platform === 'android') {
    if (hasCoords) return `google.navigation:q=${lat},${lng}&mode=w`;
    return `google.navigation:q=${encoded}&mode=w`;
  }
  if (hasCoords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=walking`;
}

function openNavigation() {
  const r = STATE.currentRecord;
  if (!r) return;

  const lat = parseCoord(r.latitude);
  const lng = parseCoord(r.longitude);
  const parts = [r.parking_lot, r.floor, r.zone, r.spot_number].filter(Boolean);
  const query = parts.length > 0 ? parts.join(' ') : '定位點';
  const url = buildWalkingNavUrl(lat, lng, query, mapPlatform());
  if (mapPlatform() === 'web') {
    window.open(url, '_blank');
    return;
  }
  window.location.href = url;
}

// =========================================================
// 分享功能
// =========================================================

function shareRecord() {
  const r = STATE.currentRecord;
  if (!r) return;

  const lines = [
    `🚗 我的車停在這裡：`,
    r.parking_lot ? `📍 停車場：${r.parking_lot}` : null,
    r.floor ? `🏢 樓層：${r.floor}` : null,
    r.zone ? `🗺 區域：${r.zone}` : null,
    r.spot_number ? `🔢 車位：${r.spot_number}` : null,
    r.notes ? `📝 備註：${r.notes}` : null,
    `⏰ 停放時間：${formatDatetime(r.parked_at)}`,
    `\n（由「定位小幫手」分享）`
  ].filter(Boolean).join('\n');

  if (navigator.share) {
    navigator.share({ title: '我的停車位置', text: lines })
      .catch(() => copyToClipboard(lines));
  } else {
    copyToClipboard(lines);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('📋 位置資訊已複製！', 'success'))
      .catch(() => showToast('❌ 複製失敗', 'error'));
  } else {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 位置資訊已複製！', 'success');
  }
}

// =========================================================
// 歷史記錄
// =========================================================

async function loadHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>載入中...</p></div>';

  try {
    const records = readRecords().sort((a, b) => Number(b.created_at) - Number(a.created_at));

    document.getElementById('history-count').textContent = records.length;

    if (records.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>尚無歷史記錄</p></div>';
      return;
    }

    container.innerHTML = records.map(r => buildHistoryCard(r)).join('');

  } catch(e) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>載入失敗</p></div>';
  }
}

function buildHistoryCard(r) {
  const isActive = isActiveRecord(r);
  const plate = r.license_plate || '未填寫';
  const dateStr = formatDatetime(r.parked_at || r.created_at);
  const type = r.vehicle_type === 'motorcycle' ? 'motorcycle' : 'car';
  const icon = type === 'motorcycle' ? 'fa-motorcycle' : 'fa-car';
  const statusLabel = isActive ? '停放中' : '已完成';
  const statusClass = isActive ? 'active' : 'done';

  const infoItems = [
    r.parking_lot ? `<span class="hcard-info"><i class="fas fa-building"></i>${r.parking_lot}</span>` : '',
    r.floor ? `<span class="hcard-info"><i class="fas fa-layer-group"></i>${r.floor}</span>` : '',
    r.zone ? `<span class="hcard-info"><i class="fas fa-map-marker-alt"></i>${r.zone}</span>` : '',
    r.spot_number ? `<span class="hcard-info"><i class="fas fa-hashtag"></i>${r.spot_number}</span>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="history-card" id="hcard-${r.id}">
      <div class="history-card-header">
        <div class="hcard-badge ${type}"><i class="fas ${icon}"></i></div>
        <div class="hcard-meta">
          <div class="hcard-plate">${plate}</div>
          <div class="hcard-date">${dateStr}</div>
        </div>
        <span class="hcard-status ${statusClass}">${statusLabel}</span>
      </div>
      ${infoItems ? `<div class="history-card-body">${infoItems}</div>` : ''}
      <div class="history-card-footer">
        ${isActive ? `<button class="btn btn-found btn-sm" onclick="goToActiveRecord()"><i class="fas fa-search-location"></i> 查看</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="askDelete('${r.id}')"><i class="fas fa-trash-alt"></i> 刪除</button>
      </div>
    </div>
  `;
}

function goToActiveRecord() {
  showFind();
}

// =========================================================
// 刪除記錄
// =========================================================

function askDelete(id) {
  STATE.deleteTarget = id;
  document.getElementById('delete-modal').classList.remove('hidden');
}
function closeDeleteModal() {
  STATE.deleteTarget = null;
  document.getElementById('delete-modal').classList.add('hidden');
}

async function executeDelete() {
  const id = STATE.deleteTarget;
  closeDeleteModal();
  if (!id) return;

  try {
    deleteRecord(id);
    showToast('🗑️ 記錄已刪除', 'info');

    // 如果刪除的是 active 記錄，清空首頁
    if (STATE.currentRecord && STATE.currentRecord.id === id) {
      stopNavMode({ silent: true });
      STATE.currentRecord = null;
      showPlaceholder();
      stopDurationTimer();
      stopHomeDistanceUpdates();
    }

    // 刷新目前畫面
    if (STATE.currentScreen === 'history') loadHistory();
    else if (STATE.currentScreen === 'stats') loadStats();
  } catch(e) {
    showToast('❌ 刪除失敗', 'error');
  }
}

async function clearAllData() {
  if (!confirm('確定要清除所有停車記錄嗎？此操作無法復原！')) return;
  try {
    writeRecords([]);
    stopNavMode({ silent: true });
    STATE.currentRecord = null;
    showPlaceholder();
    stopDurationTimer();
    stopHomeDistanceUpdates();
    showToast('🗑️ 所有記錄已清除', 'success');
    if (STATE.currentScreen !== 'home') showScreen('home');
  } catch(e) {
    showToast('❌ 清除失敗', 'error');
  }
}

// =========================================================
// 統計
// =========================================================

async function loadStats() {
  try {
    const records = readRecords();

    // 基本統計
    document.getElementById('stat-total').textContent = records.length;
    document.getElementById('stat-cars').textContent = records.filter(r => r.vehicle_type === 'car').length;
    document.getElementById('stat-motos').textContent = records.filter(r => r.vehicle_type === 'motorcycle').length;

    // 平均停放時間（僅計算已完成的）
    const done = records.filter(r => !isActiveRecord(r) && r.parked_at && r.updated_at);
    if (done.length > 0) {
      const avgMs = done.reduce((sum, r) => sum + (Number(r.updated_at) - Number(r.parked_at)), 0) / done.length;
      document.getElementById('stat-avg').textContent = formatDuration(avgMs);
    } else {
      document.getElementById('stat-avg').textContent = '—';
    }

    // 常用停車場
    const lotMap = {};
    records.forEach(r => {
      const lot = r.parking_lot;
      if (lot) lotMap[lot] = (lotMap[lot] || 0) + 1;
    });
    const sorted = Object.entries(lotMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const lotsEl = document.getElementById('frequent-lots-list');
    if (sorted.length === 0) {
      lotsEl.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;padding:8px 0;">尚無資料</p>';
    } else {
      lotsEl.innerHTML = sorted.map(([name, count], i) => `
        <div class="lot-item">
          <div class="lot-rank">${i+1}</div>
          <div class="lot-name">${name}</div>
          <div class="lot-count">${count} 次</div>
        </div>
      `).join('');
    }
  } catch(e) {
    console.error(e);
  }
}

// =========================================================
// 距離與導航模式
// =========================================================

function startHomeDistanceUpdates() {
  stopHomeDistanceUpdates();
  if (STATE.navMode) return;
  if (STATE.currentScreen !== 'find') return;
  const record = STATE.currentRecord;
  if (!record || !hasCoords(record)) return;
  refreshHomeDistance();
  STATE.distanceTimer = setInterval(refreshHomeDistance, 10000);
}

function stopHomeDistanceUpdates() {
  if (STATE.distanceTimer) {
    clearInterval(STATE.distanceTimer);
    STATE.distanceTimer = null;
  }
}

function refreshHomeDistance() {
  const record = STATE.currentRecord;
  if (!record || !hasCoords(record) || STATE.currentScreen !== 'find' || STATE.navMode) return;
  if (!navigator.geolocation) {
    document.getElementById('card-distance').textContent = '不支援定位';
    return;
  }
  const recordId = record.id;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!STATE.currentRecord || STATE.currentRecord.id !== recordId || STATE.navMode) return;
      STATE.homeGeoErrorShown = false;
      applyDistance(STATE.currentRecord, pos);
    },
    (err) => {
      if (!STATE.homeGeoErrorShown) {
        STATE.homeGeoErrorShown = true;
        showToast(geoErrorMessage(err), 'warning');
      }
      const el = document.getElementById('card-distance');
      if (el && STATE.currentRecord && STATE.currentRecord.id === recordId) {
        el.textContent = '無法取得';
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/** 把使用者位置與停車座標的距離寫到首頁卡片，回傳公尺 */
function applyDistance(record, pos) {
  const meters = haversineMeters(
    pos.coords.latitude,
    pos.coords.longitude,
    parseCoord(record.latitude),
    parseCoord(record.longitude)
  );
  const text = formatDistance(meters);
  const cardEl = document.getElementById('card-distance');
  const row = document.getElementById('card-distance-row');
  if (row) row.classList.remove('hidden');
  if (cardEl) cardEl.textContent = text;
  return meters;
}

function toggleNavMode() {
  if (STATE.navMode) stopNavMode();
  else startNavMode();
}

function startNavMode() {
  const record = STATE.currentRecord;
  if (!record) return;
  if (!hasCoords(record)) {
    showToast('⚠️ 此記錄沒有 GPS 座標，請先取得位置再儲存', 'warning');
    return;
  }
  if (!navigator.geolocation) {
    showToast('⚠️ 此裝置不支援定位功能', 'warning');
    return;
  }

  stopHomeDistanceUpdates();
  if (STATE.watchId != null) {
    navigator.geolocation.clearWatch(STATE.watchId);
    STATE.watchId = null;
  }

  STATE.navMode = true;
  STATE.voiceInside = false;
  STATE.navGeoErrorShown = false;
  bindSpeechVoices();
  // 在點擊當下先講一句，解鎖 iOS 之後的 30 公尺提醒
  unlockSpeech();

  const panel = document.getElementById('nav-panel');
  const card = document.getElementById('nav-panel-card');
  panel.classList.remove('hidden');
  card.classList.remove('is-near');
  document.getElementById('nav-distance').textContent = '定位中...';
  document.getElementById('nav-hint').textContent = '正在追蹤您與愛車的距離';
  showNavFloor(record);

  const btn = document.getElementById('btn-nav-mode');
  if (btn) btn.innerHTML = '<i class="fas fa-location-arrow"></i> 結束導航模式';

  const recordId = record.id;
  STATE.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!STATE.navMode || !STATE.currentRecord || STATE.currentRecord.id !== recordId) return;
      if (!hasCoords(STATE.currentRecord)) return;
      const meters = applyDistance(STATE.currentRecord, pos);
      updateNavPanel(meters);
      maybeAnnounceArrival(meters);
    },
    (err) => {
      if (!STATE.navMode) return;
      // 權限拒絕或定位不可用就結束；逾時先保留追蹤，避免單次逾時關掉模式
      if (err && (err.code === 1 || err.code === 2)) {
        showToast(geoErrorMessage(err), 'warning');
        STATE.homeGeoErrorShown = true;
        stopNavMode({ silent: true });
        return;
      }
      if (!STATE.navGeoErrorShown) {
        STATE.navGeoErrorShown = true;
        showToast(geoErrorMessage(err), 'warning');
      }
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
  );
}

function stopNavMode(opts) {
  opts = opts || {};
  const wasOn = STATE.navMode || STATE.watchId != null;
  if (STATE.watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(STATE.watchId);
  }
  STATE.watchId = null;
  STATE.navMode = false;
  STATE.voiceInside = false;

  const panel = document.getElementById('nav-panel');
  if (panel) panel.classList.add('hidden');
  const card = document.getElementById('nav-panel-card');
  if (card) card.classList.remove('is-near');

  const btn = document.getElementById('btn-nav-mode');
  if (btn) btn.innerHTML = '<i class="fas fa-location-arrow"></i> 導航模式';

  if (window.speechSynthesis) {
    try { speechSynthesis.cancel(); } catch (err) { /* 忽略不支援的瀏覽器 */ }
  }

  if (wasOn && !opts.silent) showToast('導航模式已結束', 'info');
  if (wasOn && STATE.currentScreen === 'find' && STATE.currentRecord && hasCoords(STATE.currentRecord)) {
    startHomeDistanceUpdates();
  }
}

function updateNavPanel(meters) {
  const card = document.getElementById('nav-panel-card');
  const hint = document.getElementById('nav-hint');
  const distEl = document.getElementById('nav-distance');
  if (distEl) distEl.textContent = formatDistance(meters);
  if (meters <= ARRIVAL_METERS) {
    if (card) card.classList.add('is-near');
    if (hint) hint.textContent = '已進入 30 公尺內，請留意語音提醒';
  } else {
    if (card) card.classList.remove('is-near');
    if (hint) hint.textContent = '接近 30 公尺時會自動語音提醒';
  }
}

/** 進入 30 公尺說一次；離開 38 公尺後才重新武裝，並有冷卻時間 */
function maybeAnnounceArrival(meters) {
  if (!STATE.navMode) return;
  if (meters > VOICE_EXIT_METERS) {
    STATE.voiceInside = false;
    return;
  }
  if (meters > ARRIVAL_METERS || STATE.voiceInside) return;
  const now = Date.now();
  STATE.voiceInside = true;
  if (now - STATE.lastVoiceAt < VOICE_COOLDOWN_MS) return;
  STATE.lastVoiceAt = now;
  speakNearby(meters);
}

function bindSpeechVoices() {
  if (!window.speechSynthesis || STATE.voicesBound) return;
  STATE.voicesBound = true;
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener('voiceschanged', () => {
    speechSynthesis.getVoices();
  });
}

function pickZhVoice() {
  if (!window.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices() || [];
  return voices.find(v => /zh[-_]TW/i.test(v.lang))
    || voices.find(v => /zh[-_]Hant/i.test(v.lang))
    || voices.find(v => /^zh/i.test(v.lang))
    || null;
}

function unlockSpeech() {
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    const utter = new SpeechSynthesisUtterance('導航開始');
    utter.lang = 'zh-TW';
    const voice = pickZhVoice();
    if (voice) utter.voice = voice;
    speechSynthesis.speak(utter);
  } catch (err) { /* 不支援語音時略過 */ }
}

function speakNearby(meters) {
  const rounded = Math.max(1, Math.round(meters));
  const text = `您已接近停車位置，距離約 ${rounded} 公尺。`;
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
    showToast(`🔊 ${text}`, 'success', 4000);
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-TW';
  const voice = pickZhVoice();
  if (voice) utter.voice = voice;
  utter.rate = 1;
  try {
    speechSynthesis.speak(utter);
  } catch (err) {
    showToast(`🔊 ${text}`, 'success', 4000);
  }
}

// =========================================================
// 照片燈箱
// =========================================================

function openPhoto(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('photo-lightbox').classList.remove('hidden');
}
function closeLightbox() {
  document.getElementById('photo-lightbox').classList.add('hidden');
}

// =========================================================
// 初始化
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  bindSpeechVoices();
  showScreen('home');
  refreshHome();

  // 每 30 秒自動刷新首頁
  setInterval(() => {
    if (STATE.currentScreen === 'find') refreshHome();
  }, 30000);
});
