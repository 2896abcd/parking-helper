import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(root, 'index (1).html'), 'utf8');

function extractFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing function ${name}`);
  const next = appSource.indexOf('\nfunction ', start + 1);
  if (next < 0) throw new Error(`cannot bound function ${name}`);
  return appSource.slice(start, next);
}

function loadHelpers() {
  const code = [
    extractFunction('normalizeFloor'),
    extractFunction('normalizeSpot'),
    extractFunction('normalizeMeetupTime'),
    'this.normalizeFloor = normalizeFloor;',
    'this.normalizeSpot = normalizeSpot;',
    'this.normalizeMeetupTime = normalizeMeetupTime;',
  ].join('\n');
  const ctx = {};
  vm.runInNewContext(code, ctx);
  return ctx;
}

const helpers = loadHelpers();

describe('existing helpers still work', () => {
  test('normalizeFloor formats 3, B2 and -2', () => {
    assert.equal(helpers.normalizeFloor('3'), '3F');
    assert.equal(helpers.normalizeFloor('B2'), 'B2');
    assert.equal(helpers.normalizeFloor('-2'), 'B2');
    assert.equal(helpers.normalizeFloor('  '), '');
  });

  test('normalizeSpot trims and keeps the text', () => {
    assert.equal(helpers.normalizeSpot('  A12  '), 'A12');
    assert.equal(helpers.normalizeSpot(''), '');
  });
});

describe('normalizeMeetupTime', () => {
  function expectMeetup(raw, ok, value) {
    const result = helpers.normalizeMeetupTime(raw);
    assert.equal(result.ok, ok, raw);
    assert.equal(result.value, value, raw);
  }

  test('blank input stays blank and valid', () => {
    expectMeetup('', true, '');
    expectMeetup('   ', true, '');
  });

  test('accepts 14:30, 1430 and 9:05 and normalizes to HH:MM', () => {
    expectMeetup('14:30', true, '14:30');
    expectMeetup('1430', true, '14:30');
    expectMeetup('9:05', true, '09:05');
  });

  test('accepts other sensible 24-hour forms', () => {
    expectMeetup('905', true, '09:05');
    expectMeetup('9', true, '09:00');
    expectMeetup('00:00', true, '00:00');
    expectMeetup('23:59', true, '23:59');
    expectMeetup(' 14：30 ', true, '14:30');
  });

  test('rejects invalid times without inventing a value', () => {
    for (const raw of ['24:00', '1460', '25:00', 'abc', '14:30pm', '99']) {
      const result = helpers.normalizeMeetupTime(raw);
      assert.equal(result.ok, false, raw);
      assert.equal(result.value, '', raw);
    }
  });
});

describe('floor modal markup', () => {
  test('集合時間 sits directly below 車位編號 with the 24-hour placeholder', () => {
    const floorForm = htmlSource.split('id="floor-form"')[1];
    assert.ok(floorForm, 'floor form exists');
    const spotAt = floorForm.indexOf('for="input-park-spot"');
    const meetupAt = floorForm.indexOf('for="input-park-meetup"');
    const actionsAt = floorForm.indexOf('modal-actions floor-actions');
    assert.ok(spotAt >= 0 && meetupAt > spotAt && actionsAt > meetupAt);
    assert.match(floorForm, /<label class="form-label" for="input-park-meetup">集合時間<\/label>/);
    assert.match(floorForm, /id="input-park-meetup"[^>]*placeholder="用24小時制輸入"/);
    assert.match(htmlSource, /id="card-meetup"/);
  });
});

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
    };
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath === '/' ? 'index (1).html' : urlPath.replace(/^\//, '');
      const file = path.normalize(path.join(root, rel));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/index%20(1).html` });
    });
    server.on('error', reject);
  });
}

async function loadPlaywright() {
  try {
    const { chromium } = await import('playwright-core');
    return chromium;
  } catch {
    return null;
  }
}

describe('meetup time in the parking modal and find-car card', () => {
  test('saves, shows, and clears 集合時間 with 取消定位', async (t) => {
    const chromium = await loadPlaywright();
    if (!chromium) {
      t.skip('playwright-core is not installed');
      return;
    }
    const { server, url } = await startStaticServer();
    const browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof openFloorPrompt === 'function');

      const recordId = await page.evaluate(() => {
        const rec = createRecord({
          vehicle_type: 'car',
          license_plate: '',
          parking_lot: '',
          floor: '',
          zone: '',
          spot_number: '',
          meetup_time: '',
          notes: '',
          photo_url: '',
          latitude: 25.03,
          longitude: 121.56,
          parked_at: Date.now(),
          is_active: true,
        });
        STATE.currentRecord = rec;
        openFloorPrompt(rec.id);
        return rec.id;
      });

      const floorHandle = page.locator('#input-park-floor');
      const spotHandle = page.locator('#input-park-spot');
      const meetupHandle = page.locator('#input-park-meetup');
      await meetupHandle.waitFor();
      const meetupBox = await meetupHandle.boundingBox();
      const spotBox = await spotHandle.boundingBox();
      assert.ok(meetupBox && spotBox);
      assert.ok(meetupBox.y > spotBox.y, '集合時間 should sit below 車位編號');
      assert.equal(await meetupHandle.getAttribute('placeholder'), '用24小時制輸入');

      await floorHandle.fill('B2');
      await spotHandle.fill('A12');
      await meetupHandle.fill('1430');
      await page.click('#floor-form button[type="submit"]');

      const saved = await page.evaluate((id) => readRecords().find((r) => r.id === id), recordId);
      assert.equal(saved.floor, 'B2');
      assert.equal(saved.spot_number, 'A12');
      assert.equal(saved.meetup_time, '14:30');

      await page.evaluate(() => showFind());
      await page.waitForSelector('#current-car-card:not(.hidden)');
      assert.equal(await page.locator('#card-floor').innerText(), 'B2');
      assert.equal(await page.locator('#card-spot').innerText(), 'A12');
      assert.equal(await page.locator('#card-meetup').innerText(), '14:30');
      const meetupItemHidden = await page.locator('#card-meetup').evaluate((el) => el.closest('.info-item').classList.contains('hidden'));
      assert.equal(meetupItemHidden, false);

      await page.evaluate(() => confirmCancelLocation());
      const afterCancel = await page.evaluate((id) => readRecords().find((r) => r.id === id) || null, recordId);
      assert.equal(afterCancel, null);
      await page.waitForSelector('#no-car-placeholder:not(.hidden)');

      // Invalid time should not block saving floor; meetup stays blank.
      const secondId = await page.evaluate(() => {
        const rec = createRecord({
          vehicle_type: 'car',
          license_plate: '',
          parking_lot: '',
          floor: '',
          zone: '',
          spot_number: '',
          meetup_time: '',
          notes: '',
          photo_url: '',
          latitude: 25.03,
          longitude: 121.56,
          parked_at: Date.now(),
          is_active: true,
        });
        STATE.currentRecord = rec;
        openFloorPrompt(rec.id);
        return rec.id;
      });
      await page.fill('#input-park-floor', '3');
      await page.fill('#input-park-meetup', 'abc');
      await page.click('#floor-form button[type="submit"]');
      const second = await page.evaluate((id) => readRecords().find((r) => r.id === id), secondId);
      assert.equal(second.floor, '3F');
      assert.equal(second.meetup_time, '');
      const toast = await page.locator('#toast').innerText();
      assert.match(toast, /集合時間看不懂/);
    } finally {
      await browser.close();
      server.close();
    }
  });
});
