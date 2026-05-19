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
};

const TABLE = 'parking_records';

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

  const backBtn = document.getElementById('btn-back');
  const titles = {
    home: '🚗 停車小幫手',
    save: '📍 記錄停車位置',
    history: '📋 歷史記錄',
    stats: '📊 使用統計',
  };
  document.getElementById('nav-title').textContent = titles[name] || '停車小幫手';
  if (name === 'home') {
    backBtn.classList.add('hidden');
  } else {
    backBtn.classList.remove('hidden');
  }
}

function goBack() {
  showScreen('home');
  refreshHome();
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
    const res = await fetch(`tables/${TABLE}?sort=created_at&limit=100`);
    const json = await res.json();
    const active = (json.data || []).find(r => r.is_active === true || r.is_active === 'true');
    STATE.currentRecord = active || null;

    if (active) {
      renderCurrentCard(active);
      startDurationTimer(active.parked_at);
    } else {
      showPlaceholder();
      stopDurationTimer();
    }
  } catch (e) {
    console.error(e);
    showPlaceholder();
  }
}

function showPlaceholder() {
  document.getElementById('no-car-placeholder').classList.remove('hidden');
  document.getElementById('current-car-card').classList.add('hidden');
}

function renderCurrentCard(r) {
  document.getElementById('no-car-placeholder').classList.add('hidden');
  document.getElementById('current-car-card').classList.remove('hidden');

  // 車輛圖示
  const badge = document.getElementById('card-vehicle-badge');
  badge.innerHTML = r.vehicle_type === 'motorcycle'
    ? '<i class="fas fa-motorcycle"></i>'
    : '<i class="fas fa-car"></i>';

  document.getElementById('card-plate').textContent = r.license_plate || '未填寫';
  document.getElementById('card-lot').textContent = r.parking_lot || '未填寫';
  document.getElementById('card-floor').textContent = r.floor || '—';
  document.getElementById('card-zone').textContent = r.zone || '—';
  document.getElementById('card-spot').textContent = r.spot_number || '—';
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
  document.getElementById('photo-preview-wrap').classList.add('hidden');
  document.getElementById('photo-upload-area').classList.remove('hidden');
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
      parked_at:     Date.now(),
      is_active:     true,
    };

    await fetch(`tables/${TABLE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
async function deactivateAll() {
  try {
    const res = await fetch(`tables/${TABLE}?limit=200`);
    const json = await res.json();
    const actives = (json.data || []).filter(r => r.is_active === true || r.is_active === 'true');
    for (const r of actives) {
      await fetch(`tables/${TABLE}/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
    }
  } catch(e) { console.warn('deactivateAll error', e); }
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
    await fetch(`tables/${TABLE}/${STATE.currentRecord.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });
    showToast('🎉 太好了！希望您行車平安！', 'success', 3500);
    STATE.currentRecord = null;
    showPlaceholder();
    stopDurationTimer();
  } catch(e) {
    showToast('❌ 更新失敗', 'error');
  }
}

// =========================================================
// 導航功能
// =========================================================

function openNavigation() {
  const r = STATE.currentRecord;
  if (!r) return;

  // 組合查詢字串
  const parts = [r.parking_lot, r.floor, r.zone, r.spot_number].filter(Boolean);
  const query = parts.length > 0 ? parts.join(' ') : '停車場';

  // 嘗試 iOS Maps → Google Maps → 網頁版
  const encodedQuery = encodeURIComponent(query);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  if (isIOS) {
    window.location.href = `maps://?q=${encodedQuery}`;
  } else if (isAndroid) {
    window.location.href = `geo:0,0?q=${encodedQuery}`;
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedQuery}`, '_blank');
  }
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
    `\n（由「停車小幫手」分享）`
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
    const res = await fetch(`tables/${TABLE}?limit=200`);
    const json = await res.json();
    const records = (json.data || []).sort((a, b) => Number(b.created_at) - Number(a.created_at));

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
  const isActive = r.is_active === true || r.is_active === 'true';
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
  showScreen('home');
  refreshHome();
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
    await fetch(`tables/${TABLE}/${id}`, { method: 'DELETE' });
    showToast('🗑️ 記錄已刪除', 'info');

    // 如果刪除的是 active 記錄，清空首頁
    if (STATE.currentRecord && STATE.currentRecord.id === id) {
      STATE.currentRecord = null;
      showPlaceholder();
      stopDurationTimer();
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
    const res = await fetch(`tables/${TABLE}?limit=500`);
    const json = await res.json();
    const ids = (json.data || []).map(r => r.id);
    for (const id of ids) {
      await fetch(`tables/${TABLE}/${id}`, { method: 'DELETE' });
    }
    STATE.currentRecord = null;
    showPlaceholder();
    stopDurationTimer();
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
    const res = await fetch(`tables/${TABLE}?limit=500`);
    const json = await res.json();
    const records = json.data || [];

    // 基本統計
    document.getElementById('stat-total').textContent = records.length;
    document.getElementById('stat-cars').textContent = records.filter(r => r.vehicle_type === 'car').length;
    document.getElementById('stat-motos').textContent = records.filter(r => r.vehicle_type === 'motorcycle').length;

    // 平均停放時間（僅計算已完成的）
    const done = records.filter(r => !(r.is_active === true || r.is_active === 'true') && r.parked_at && r.updated_at);
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
  showScreen('home');
  refreshHome();

  // 每 30 秒自動刷新首頁
  setInterval(() => {
    if (STATE.currentScreen === 'home') refreshHome();
  }, 30000);
});
