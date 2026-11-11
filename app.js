(() => {
  'use strict';

  // Version of the files, taken from the ?v= on this script's address in index.html.
  const script = document.currentScript;
  const VERSION = (script && new URL(script.src).searchParams.get('v')) || '0';

  const STORE_KEY = 'smsremote.v1';
  const PASS_TOKEN = '{pass}';
  // The Android app sends with one tap; the web version can only open the SMS app.
  // The ?v= is the APK's versionCode; raise it when a new APK is uploaded.
  const APK_URL = 'https://arezaei.ir/sms-remote/download/sms-remote.apk?v=3';
  const bridge = window.AndroidBridge || null; // only present inside the Android app
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const $app = document.getElementById('app');
  const $sheets = document.getElementById('sheets');
  const $toast = document.getElementById('toast');

  /* ------------------------------------------------------------------ icons */
  const ICONS = {
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M14.5 12v.5"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    sim: '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><rect x="9" y="12" width="6" height="6" rx="1"/>',
    power: '<path d="M12 3v9"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 21h4"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M16 7l3 3"/>',
    plug: '<path d="M9 3v5"/><path d="M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8z"/><path d="M12 17v4"/>',
    message: '<path d="M5 5h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/>',
    // interface icons
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    gear: '<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    download: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  };
  const CMD_ICONS = ['lock', 'unlock', 'power', 'door', 'shield', 'pulse', 'sim', 'bell', 'bulb', 'plug', 'phone', 'key', 'home', 'message'];
  const COLORS = ['red', 'green', 'blue', 'amber', 'violet', 'slate'];

  function icon(name) {
    const t = document.createElement('template');
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.message) + '</svg>';
    return t.content.firstChild;
  }

  /* ---------------------------------------------------------------- presets */
  // Codes for the Classic preset are the ones used by the vendor's own web app.
  const PRESETS = {
    classic: {
      title: 'کلاسیک (Z4 Ultra / G1)',
      desc: 'دکمه‌ها و کدها آماده است.',
      commands: [
        { label: 'فعال', code: '!*{pass}*21*', icon: 'lock', color: 'red' },
        { label: 'غیرفعال', code: '!*{pass}*31*', icon: 'unlock', color: 'green' },
        { label: 'دربازکن', code: '!*{pass}*11', icon: 'door', color: 'blue' },
        { label: 'وضعیت دزدگیر', code: '!*{pass}*22*', icon: 'shield', color: 'violet' },
        { label: 'وضعیت تلفن‌کننده', code: '!*{pass}*01', icon: 'pulse', color: 'slate' },
        { label: 'موجودی سیم‌کارت', code: '!*{pass}*80', icon: 'sim', color: 'amber' },
      ],
    },
    custom: {
      title: 'سایر مدل‌ها',
      desc: 'کد روشن و خاموش را از دفترچه دستگاه خودتان وارد می‌کنید.',
      commands: [
        { label: 'روشن', code: '', icon: 'lock', color: 'red' },
        { label: 'خاموش', code: '', icon: 'unlock', color: 'green' },
      ],
    },
  };
  const presetCommands = (key) => PRESETS[key].commands.map((c) => ({ id: uid(), ...c }));

  /* ------------------------------------------------------------------ utils */
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function toLatinDigits(s) {
    return String(s)
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  }
  function normPhone(s) {
    const t = toLatinDigits(s).trim();
    return (t.startsWith('+') ? '+' : '') + t.replace(/\D/g, '');
  }
  const usesPass = (code) => /\{pass\}/i.test(code);
  const fillPass = (code, pass) => code.replace(/\{pass\}/gi, pass);
  const PASS_BLANK = '____'; // shown where the password goes, so it never appears on screen
  const maskPass = (code) => code.replace(/\{pass\}/gi, PASS_BLANK);

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'value') el.value = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const iconBtn = (name, label, onclick, extra) =>
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, title: label, onclick, ...extra }, icon(name));

  // Download card for the Android app (web version only). On the main pages it stays pinned to
  // the bottom of the screen until closed; the copy in Settings is always there.
  function apkCard(pinned) {
    if (bridge || (pinned && state.settings.apkHidden)) return null;
    const card = h('div', { class: 'apk-card' },
      h('a', { class: 'apk-main', href: APK_URL, download: 'sms-remote.apk', rel: 'noopener' },
        h('span', { class: 'ic' }, icon('download')),
        h('span', { class: 'tx' }, h('b', null, 'برنامه اندروید'), h('span', null, 'ارسال پیامک فقط با یک لمس')),
        h('span', { class: 'go' }, 'دانلود')),
      pinned && iconBtn('close', 'بستن؛ از تنظیمات هم در دسترس است', () => {
        state.settings.apkHidden = true;
        save(); render();
        toast('دانلود برنامه اندروید از «تنظیمات» در دسترس است');
      }));
    return pinned ? h('footer', { class: 'page-foot' }, card) : card;
  }

  let toastTimer = 0;
  function toast(text, kind) {
    $toast.textContent = text;
    $toast.className = 'show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $toast.className = ''; }, 3200);
  }

  /* ------------------------------------------------------------------ state */
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* ignore */ }
    if (!s || !Array.isArray(s.devices)) s = { devices: [], activeId: null, settings: {} };
    s.settings = Object.assign({ direct: true, confirm: false }, s.settings);
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('ذخیره اطلاعات ممکن نشد', 'err'); }
  }
  let state = load();
  const activeDevice = () => state.devices.find((d) => d.id === state.activeId) || state.devices[0] || null;

  /* ----------------------------------------------------------------- sheets */
  const sheetStack = [];
  let histOK = true;
  let closing = 0;
  try { history.replaceState({ depth: 0 }, ''); } catch (e) { histOK = false; }

  function popSheets(depth) {
    while (sheetStack.length > depth) {
      sheetStack.pop().overlay.remove();
      closing = Math.max(0, closing - 1);
    }
  }
  window.addEventListener('popstate', (e) => popSheets((e.state && e.state.depth) || 0));

  function closeSheet(n = 1) {
    n = Math.min(n, sheetStack.length - closing);
    if (n <= 0) return;
    if (histOK) { closing += n; history.go(-n); } else popSheets(sheetStack.length - n);
  }

  function openSheet({ title, body, foot, full }) {
    const overlay = h('div', { class: 'sheet-overlay' },
      h('div', { class: 'sheet' + (full ? ' full' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'sheet-head' }, h('h2', null, title), iconBtn('close', 'بستن', () => closeSheet())),
        h('div', { class: 'sheet-body' }, body),
        foot && h('div', { class: 'sheet-foot' }, foot)));
    if (!full) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });
    $sheets.append(overlay);
    sheetStack.push({ overlay });
    if (histOK) {
      try { history.pushState({ depth: sheetStack.length }, ''); } catch (e) { histOK = false; }
    }
  }

  function confirmDialog({ title, text, okLabel, danger }, onOk) {
    openSheet({
      title,
      body: h('p', { class: 'dialog-text' }, text),
      foot: h('div', { class: 'row' },
        h('button', { class: 'btn secondary', type: 'button', onclick: () => closeSheet() }, 'انصراف'),
        h('button', { class: 'btn' + (danger ? ' danger' : ''), type: 'button', onclick: onOk }, okLabel)),
    });
  }

  /* ---------------------------------------------------------------- sending */
  let reqSeq = 0;
  const pending = new Map();

  function smsUrl(phone, body) {
    return 'sms:' + phone + (isIOS ? '&' : '?') + 'body=' + encodeURIComponent(body);
  }

  function trigger(dev, cmd, tile) {
    if (!cmd.code.trim()) {
      toast('اول کد پیامک این دکمه را وارد کنید');
      openCommandEditor({
        cmd, pass: dev.pass,
        onSave: (c) => { Object.assign(cmd, c); save(); render(); },
        onDelete: () => { dev.commands = dev.commands.filter((x) => x !== cmd); save(); render(); },
      });
      return;
    }
    if (usesPass(cmd.code) && !dev.pass) {
      toast('رمز دستگاه وارد نشده است', 'err');
      openDeviceEditor(dev.id);
      return;
    }
    const body = fillPass(cmd.code, dev.pass);

    if (!bridge) { // web: the browser can only open the SMS app with the text filled in
      window.location.href = smsUrl(dev.phone, body);
      return;
    }
    if (!state.settings.direct) { bridge.openSms(dev.phone, body); return; }

    const go = () => {
      if (tile) { tile.disabled = true; setTimeout(() => { tile.disabled = false; }, 1500); }
      const id = String(++reqSeq);
      pending.set(id, { dev, cmd, body });
      toast('در حال ارسال «' + cmd.label + '»…');
      bridge.sendSms(id, dev.phone, body);
    };
    if (state.settings.confirm) {
      confirmDialog({
        title: 'ارسال پیامک',
        text: 'پیامک «' + cmd.label + '» برای «' + dev.name + '» ارسال شود؟',
        okLabel: 'ارسال',
      }, () => { closeSheet(); go(); });
    } else go();
  }

  // Called by the Android app when the system reports the outcome of a direct send.
  window.onSmsResult = (id, status, detail) => {
    const p = pending.get(id);
    pending.delete(id);
    const label = p ? '«' + p.cmd.label + '»' : 'پیامک';
    if (status === 'sent') {
      toast('✓ ' + label + (p ? ' برای ' + p.dev.name : '') + ' ارسال شد', 'ok');
    } else if (status === 'denied') {
      openSmsPermissionHelp(p);
    } else {
      toast('ارسال نشد' + (detail ? ': ' + detail : ''), 'err');
    }
  };

  // Android refuses the SMS permission to apps installed from a downloaded file ("App was denied
  // access to SMS") until the owner lifts that restriction in the app's system settings. The app
  // cannot do it for them, so a refusal gets the steps and a way to send this one message anyway.
  let helpSheet = null; // the open guide, so it can close itself once the permission is given
  function openSmsPermissionHelp(job) {
    const steps = [
      'دکمه «باز کردن تنظیمات برنامه» را در پایین همین صفحه بزنید.',
      'در صفحه‌ای که باز می‌شود، سه‌نقطه ⋮ بالای صفحه را بزنید و «Allow restricted settings» (اجازه به تنظیمات محدودشده) را انتخاب کنید. اگر سه‌نقطه یا این گزینه را ندیدید، به مرحله بعد بروید.',
      'در همان صفحه به «Permissions» (مجوزها) بروید، «SMS» (پیامک) را بزنید و «Allow» (مجاز) را انتخاب کنید.',
      'به این برنامه برگردید و دکمه را دوباره بزنید.',
    ];
    openSheet({
      title: 'اجازه ارسال پیامک',
      body: h('div', null,
        h('p', { class: 'dialog-text' }, 'گوشی اجازه ارسال پیامک را به این برنامه نداد. اندروید این اجازه را برای برنامه‌هایی که بیرون از فروشگاه نصب شده‌اند می‌بندد و باید یک بار خودتان آن را باز کنید:'),
        h('div', { class: 'card' }, h('ol', { class: 'steps' }, steps.map((s) => h('li', null, s))))),
      foot: h('div', { class: 'stack' },
        h('button', { class: 'btn', type: 'button', onclick: () => bridge.openAppSettings() }, 'باز کردن تنظیمات برنامه'),
        job && h('button', { class: 'btn secondary', type: 'button', onclick: () => { closeSheet(); bridge.openSms(job.dev.phone, job.body); } },
          'این بار از برنامه پیامک بفرست')),
    });
    helpSheet = sheetStack[sheetStack.length - 1];
  }

  // Called by the Android app each time it comes back to the front (e.g. from system settings).
  window.onAppResume = () => {
    if (!helpSheet || sheetStack[sheetStack.length - 1] !== helpSheet || !bridge.hasSmsPermission()) return;
    helpSheet = null;
    closeSheet();
    toast('اجازه پیامک داده شد؛ حالا دکمه را بزنید', 'ok');
  };

  /* -------------------------------------------------------------- main view */
  // Element.append() would print a missing (null) part as the word "null", so drop those first.
  function mount(...parts) {
    $app.append(...parts.filter(Boolean));
  }

  function render() {
    $app.replaceChildren();
    if (!state.devices.length) { renderWelcome(); return; }
    const dev = activeDevice();
    state.activeId = dev.id;

    mount(
      h('header', { class: 'topbar' },
        h('div', { class: 'brand' }, h('img', { src: 'icons/icon.svg', alt: '' }), 'ریموت پیامکی'),
        iconBtn('gear', 'تنظیمات', openSettings)),

      h('nav', { class: 'tabs', 'aria-label': 'دستگاه‌ها' },
        state.devices.map((d) => h('button', {
          class: 'tab' + (d.id === dev.id ? ' active' : ''), type: 'button',
          'aria-pressed': String(d.id === dev.id),
          onclick: () => { state.activeId = d.id; save(); render(); },
        }, d.name)),
        h('button', { class: 'tab add', type: 'button', onclick: () => openDeviceEditor(null) }, icon('plus'), 'دستگاه جدید')),

      h('section', { class: 'device-card' },
        h('div', { class: 'avatar' }, icon('home')),
        h('div', { class: 'info' },
          h('div', { class: 'name' }, dev.name),
          h('div', { class: 'phone ltr' }, dev.phone)),
        iconBtn('pencil', 'ویرایش دستگاه و دکمه‌ها', () => openDeviceEditor(dev.id))),

      h('section', { class: 'grid' },
        dev.commands.length
          ? dev.commands.map((cmd, i) => {
            const wide = dev.commands.length % 2 === 1 && i === dev.commands.length - 1;
            const tile = h('button', {
              class: 'tile c-' + cmd.color + (wide ? ' wide' : ''), type: 'button',
              onclick: () => trigger(dev, cmd, tile),
            }, h('span', { class: 'bubble' }, icon(cmd.icon)), h('span', { class: 'label' }, cmd.label));
            return tile;
          })
          : h('div', { class: 'empty-cmds' }, 'هنوز دکمه‌ای ندارید. از دکمه ویرایش (مداد) یک دکمه اضافه کنید.')),

      h('p', { class: 'hint' }, bridge && state.settings.direct
        ? 'با لمس هر دکمه، پیامک همان لحظه برای دستگاه ارسال می‌شود.'
        : 'با لمس هر دکمه، صفحه پیامک با متن آماده باز می‌شود؛ فقط «ارسال» را بزنید.'),
      apkCard(true));
  }

  function renderWelcome() {
    mount(h('div', { class: 'welcome' },
      h('img', { src: 'icons/icon.svg', alt: '' }),
      h('h1', null, 'ریموت پیامکی'),
      h('p', null, 'دزدگیر و هر وسیله پیامکی را با یک لمس روشن و خاموش کنید. کافی است یک بار شماره سیم‌کارت و رمز دستگاه را وارد کنید.'),
      h('button', { class: 'btn', type: 'button', onclick: () => openDeviceEditor(null) }, icon('plus'), 'افزودن دستگاه')),
      apkCard(true));
  }

  /* ---------------------------------------------------------- device editor */
  function openDeviceEditor(deviceId) {
    const existing = state.devices.find((d) => d.id === deviceId) || null;
    const draft = existing
      ? JSON.parse(JSON.stringify(existing))
      : { id: uid(), name: '', phone: '', pass: '', commands: presetCommands('classic') };
    let preset = 'classic';

    const nameIn = h('input', { class: 'input', id: 'f-name', value: draft.name, placeholder: 'مثلاً خانه', autocomplete: 'off', maxlength: '30', enterkeyhint: 'next' });
    const phoneIn = h('input', { class: 'input ltr', id: 'f-phone', value: draft.phone, placeholder: '09xxxxxxxxx', type: 'tel', inputmode: 'tel', autocomplete: 'off', maxlength: '20', enterkeyhint: 'next' });
    const passIn = h('input', { class: 'input ltr', id: 'f-pass', value: draft.pass, placeholder: 'مثلاً 1234', type: existing ? 'password' : 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: '20', enterkeyhint: 'done' });
    const errs = { name: h('div', { class: 'error', hidden: true }), phone: h('div', { class: 'error', hidden: true }), pass: h('div', { class: 'error', hidden: true }) };
    const inputs = { name: nameIn, phone: phoneIn, pass: passIn };
    const setErr = (k, msg) => {
      errs[k].textContent = msg || '';
      errs[k].hidden = !msg;
      inputs[k].classList.toggle('invalid', !!msg);
    };
    Object.keys(inputs).forEach((k) => inputs[k].addEventListener('input', () => setErr(k, '')));

    const presetBox = h('div', { class: 'cmd-list' });
    const renderPresets = () => {
      presetBox.replaceChildren(...Object.entries(PRESETS).map(([key, p]) =>
        h('button', {
          class: 'cmd-row', type: 'button', 'aria-pressed': String(preset === key),
          style: preset === key ? 'border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary) inset;' : null,
          onclick: () => { preset = key; draft.commands = presetCommands(key); renderPresets(); renderCmds(); },
        },
        h('span', { class: 'dot c-' + (preset === key ? 'blue' : 'slate') }, icon(preset === key ? 'check' : 'shield')),
        h('span', { class: 'txt' }, h('b', null, p.title), h('span', null, p.desc)))));
    };

    const cmdBox = h('div', { class: 'cmd-list' });
    const editCmd = (cmd) => openCommandEditor({
      cmd, pass: toLatinDigits(passIn.value.trim()),
      onSave: (c) => {
        if (cmd) Object.assign(cmd, c); else draft.commands.push(c);
        renderCmds();
      },
      onDelete: cmd && (() => { draft.commands = draft.commands.filter((x) => x !== cmd); renderCmds(); }),
    });
    const move = (i, by) => {
      const j = i + by;
      [draft.commands[i], draft.commands[j]] = [draft.commands[j], draft.commands[i]];
      renderCmds();
    };
    function renderCmds() {
      cmdBox.replaceChildren(...draft.commands.map((cmd, i) =>
        h('div', { class: 'cmd-row' },
          h('span', { class: 'dot c-' + cmd.color }, icon(cmd.icon)),
          h('button', { class: 'txt', type: 'button', onclick: () => editCmd(cmd) },
            h('b', null, cmd.label),
            h('span', { class: cmd.code ? 'ltr mono' : '' }, cmd.code ? maskPass(cmd.code) : 'کد وارد نشده — برای وارد کردن لمس کنید')),
          iconBtn('up', 'بالا', () => move(i, -1), { disabled: i === 0 }),
          iconBtn('down', 'پایین', () => move(i, 1), { disabled: i === draft.commands.length - 1 }))));
      if (!draft.commands.length) cmdBox.append(h('div', { class: 'empty-cmds' }, 'دکمه‌ای وجود ندارد.'));
    }

    const submit = () => {
      const name = nameIn.value.trim();
      const phone = normPhone(phoneIn.value);
      const pass = toLatinDigits(passIn.value.trim());
      setErr('name', name ? '' : 'یک نام برای دستگاه بنویسید.');
      setErr('phone', /^\+?\d{4,15}$/.test(phone) ? '' : 'شماره سیم‌کارت دستگاه را درست وارد کنید.');
      setErr('pass', pass || !draft.commands.some((c) => usesPass(c.code)) ? '' : 'رمز دستگاه را وارد کنید.');
      const bad = Object.keys(errs).find((k) => !errs[k].hidden);
      if (bad) { inputs[bad].focus(); return; }

      Object.assign(draft, { name, phone, pass });
      const idx = state.devices.findIndex((d) => d.id === draft.id);
      if (idx >= 0) state.devices[idx] = draft; else state.devices.push(draft);
      state.activeId = draft.id;
      save(); render(); closeSheet();
      toast(existing ? 'تغییرات ذخیره شد' : '«' + name + '» اضافه شد', 'ok');
    };

    const remove = () => confirmDialog({
      title: 'حذف دستگاه',
      text: '«' + existing.name + '» و همه دکمه‌هایش حذف شود؟',
      okLabel: 'حذف', danger: true,
    }, () => {
      state.devices = state.devices.filter((d) => d.id !== existing.id);
      state.activeId = state.devices[0] ? state.devices[0].id : null;
      save(); render(); closeSheet(2);
    });

    const body = h('form', { novalidate: true, onsubmit: (e) => { e.preventDefault(); submit(); } },
      h('div', { class: 'field' }, h('label', { for: 'f-name' }, 'نام دستگاه'), nameIn, errs.name),
      h('div', { class: 'field' }, h('label', { for: 'f-phone' }, 'شماره سیم‌کارت دستگاه'), phoneIn, errs.phone,
        h('div', { class: 'help' }, 'شماره سیم‌کارتی که داخل دزدگیر یا تلفن‌کننده است.')),
      h('div', { class: 'field' }, h('label', { for: 'f-pass' }, 'رمز دستگاه'),
        h('div', { class: 'input-wrap' }, passIn,
          iconBtn('eye', 'نمایش یا پنهان کردن رمز', () => { passIn.type = passIn.type === 'password' ? 'text' : 'password'; })),
        errs.pass,
        h('div', { class: 'help' }, 'رمز به‌صورت خودکار داخل متن پیامک‌ها گذاشته می‌شود.')),
      !existing && h('div', null, h('div', { class: 'section-title' }, 'مدل دستگاه'), presetBox),
      h('div', { class: 'section-title' }, 'دکمه‌ها', h('small', null, 'برای ویرایش، روی هر دکمه بزنید')),
      cmdBox,
      h('button', { class: 'btn ghost', type: 'button', style: 'margin-top:8px', onclick: () => editCmd(null) }, icon('plus'), 'افزودن دکمه'),
      existing && h('button', { class: 'btn danger', type: 'button', style: 'margin-top:14px', onclick: remove }, icon('trash'), 'حذف این دستگاه'),
      h('button', { type: 'submit', hidden: true }));

    renderPresets();
    renderCmds();
    openSheet({
      title: existing ? 'ویرایش ' + existing.name : 'دستگاه جدید',
      full: true,
      body,
      foot: h('button', { class: 'btn', type: 'button', onclick: submit }, 'ذخیره'),
    });
    if (!existing) setTimeout(() => nameIn.focus(), 250);
  }

  /* --------------------------------------------------------- command editor */
  function openCommandEditor({ cmd, pass, onSave, onDelete }) {
    const draft = cmd ? { ...cmd } : { id: uid(), label: '', code: '', icon: 'power', color: 'blue' };

    const labelIn = h('input', { class: 'input', id: 'c-label', value: draft.label, placeholder: 'مثلاً روشن', autocomplete: 'off', maxlength: '24' });
    const codeIn = h('input', { class: 'input ltr mono', id: 'c-code', value: draft.code, placeholder: '!*{pass}*21*', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', maxlength: '160' });
    const labelErr = h('div', { class: 'error', hidden: true }, 'یک نام برای دکمه بنویسید.');
    const codeErr = h('div', { class: 'error', hidden: true }, 'متن پیامک را وارد کنید.');
    const preview = h('div', { class: 'preview ltr mono' });
    const updatePreview = () => {
      const code = toLatinDigits(codeIn.value);
      preview.textContent = code ? fillPass(code, pass || PASS_BLANK) : '—';
    };
    labelIn.addEventListener('input', () => { labelErr.hidden = true; labelIn.classList.remove('invalid'); });
    codeIn.addEventListener('input', () => { codeErr.hidden = true; codeIn.classList.remove('invalid'); updatePreview(); });

    const insertPass = () => {
      const s = codeIn.selectionStart == null ? codeIn.value.length : codeIn.selectionStart;
      const e = codeIn.selectionEnd == null ? s : codeIn.selectionEnd;
      codeIn.value = codeIn.value.slice(0, s) + PASS_TOKEN + codeIn.value.slice(e);
      codeIn.focus();
      codeIn.setSelectionRange(s + PASS_TOKEN.length, s + PASS_TOKEN.length);
      codeIn.dispatchEvent(new Event('input'));
    };

    const iconBox = h('div', { class: 'choices', role: 'group', 'aria-label': 'شکل دکمه' });
    const colorBox = h('div', { class: 'choices', role: 'group', 'aria-label': 'رنگ دکمه' });
    const renderChoices = () => {
      iconBox.replaceChildren(...CMD_ICONS.map((name) => h('button', {
        class: 'choice' + (draft.icon === name ? ' selected' : ''), type: 'button', 'aria-label': name,
        'aria-pressed': String(draft.icon === name),
        onclick: () => { draft.icon = name; renderChoices(); },
      }, icon(name))));
      colorBox.replaceChildren(...COLORS.map((c) => h('button', {
        class: 'choice color c-' + c + (draft.color === c ? ' selected' : ''), type: 'button', 'aria-label': c,
        'aria-pressed': String(draft.color === c),
        onclick: () => { draft.color = c; renderChoices(); },
      })));
    };

    const submit = () => {
      const label = labelIn.value.trim();
      const code = toLatinDigits(codeIn.value).trim();
      labelErr.hidden = !!label; labelIn.classList.toggle('invalid', !label);
      codeErr.hidden = !!code; codeIn.classList.toggle('invalid', !code);
      if (!label) { labelIn.focus(); return; }
      if (!code) { codeIn.focus(); return; }
      onSave({ ...draft, label, code });
      closeSheet();
    };

    renderChoices();
    updatePreview();
    openSheet({
      title: cmd ? 'ویرایش دکمه' : 'دکمه جدید',
      body: h('form', { novalidate: true, onsubmit: (e) => { e.preventDefault(); submit(); } },
        h('div', { class: 'field' }, h('label', { for: 'c-label' }, 'نام دکمه'), labelIn, labelErr),
        h('div', { class: 'field' }, h('label', { for: 'c-code' }, 'متن پیامک (کد دستور)'), codeIn, codeErr,
          h('div', { class: 'help' }, 'کد را از دفترچه دستگاه بنویسید. هر جا رمز دستگاه لازم است، دکمه زیر را بزنید تا ', h('span', { class: 'ltr mono' }, PASS_TOKEN), ' گذاشته شود.'),
          h('button', { class: 'btn secondary small', type: 'button', style: 'margin-top:8px', onclick: insertPass }, icon('key'), 'درج رمز در کد')),
        h('div', { class: 'field' }, h('label', null, 'پیامکی که ارسال می‌شود'), preview),
        h('div', { class: 'field' }, h('label', null, 'شکل'), iconBox),
        h('div', { class: 'field' }, h('label', null, 'رنگ'), colorBox),
        onDelete && h('button', { class: 'btn danger', type: 'button', onclick: () => { onDelete(); closeSheet(); } }, icon('trash'), 'حذف این دکمه'),
        h('button', { type: 'submit', hidden: true })),
      foot: h('button', { class: 'btn', type: 'button', onclick: submit }, 'تأیید'),
    });
  }

  /* --------------------------------------------------------------- settings */
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });

  function switchRow(title, desc, key) {
    const sw = h('button', {
      class: 'switch', type: 'button', role: 'switch', 'aria-label': title,
      'aria-checked': String(!!state.settings[key]),
      onclick: () => {
        state.settings[key] = !state.settings[key];
        sw.setAttribute('aria-checked', String(state.settings[key]));
        save(); render();
      },
    });
    return h('div', { class: 'card switch-row' }, h('div', { class: 'grow' }, h('h3', null, title), h('p', null, desc)), sw);
  }

  function openSettings() {
    const body = h('div', null);
    if (bridge) {
      body.append(
        switchRow('ارسال فوری با یک لمس', 'با زدن هر دکمه، پیامک همان لحظه ارسال می‌شود. اگر خاموش باشد، صفحه پیامک با متن آماده باز می‌شود.', 'direct'),
        switchRow('پرسش قبل از ارسال', 'برای جلوگیری از لمس اشتباهی، قبل از ارسال تأیید گرفته می‌شود.', 'confirm'),
        h('div', { class: 'card' },
          h('h3', null, 'ارسال فوری کار نمی‌کند؟'),
          h('p', null, 'اگر گوشی پیام «App was denied access to SMS» می‌دهد، باید یک بار اجازه پیامک را در تنظیمات گوشی باز کنید.'),
          h('button', { class: 'btn small', type: 'button', style: 'margin-top:10px', onclick: () => openSmsPermissionHelp(null) }, 'راهنمای اجازه پیامک')));
    } else {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      if (!standalone) {
        const steps = isIOS
          ? ['این صفحه را در Safari باز کنید.', 'دکمه Share (اشتراک‌گذاری) را بزنید.', 'گزینه Add to Home Screen را انتخاب کنید.']
          : ['منوی مرورگر (سه‌نقطه) را باز کنید.', 'گزینه Install app یا Add to Home screen را بزنید.'];
        body.append(h('div', { class: 'card' },
          h('h3', null, 'نصب روی صفحه اصلی گوشی'),
          h('p', null, 'تا مثل یک برنامه، با یک لمس باز شود.'),
          installPrompt
            ? h('button', { class: 'btn small', type: 'button', style: 'margin-top:10px', onclick: () => { installPrompt.prompt(); installPrompt = null; closeSheet(); } }, 'نصب برنامه')
            : h('ol', null, steps.map((s) => h('li', null, s)))));
      }
      body.append(h('div', { class: 'card' },
        h('h3', null, 'ارسال پیامک در نسخه وب'),
        h('p', null, 'مرورگرها اجازه ارسال خودکار پیامک نمی‌دهند؛ بنابراین صفحه پیامک با شماره و متن آماده باز می‌شود و شما فقط «ارسال» را می‌زنید.' +
          (isIOS ? '' : ' برای ارسال فوری با یک لمس، برنامه اندروید را نصب کنید.'))),
        apkCard(false));
    }
    body.append(h('div', { class: 'card' },
      h('h3', null, 'حریم خصوصی'),
      h('p', null, 'شماره‌ها و رمزها فقط روی همین گوشی ذخیره می‌شوند و به هیچ سروری فرستاده نمی‌شوند.')));
    openSheet({ title: 'تنظیمات', body });
  }

  /* ------------------------------------------------------------------- boot */
  if (bridge && typeof bridge.isDark === 'function') {
    document.documentElement.dataset.theme = bridge.isDark() ? 'dark' : 'light';
  }
  if (!bridge && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js?v=' + VERSION).catch(() => {}); });
  }
  render();
})();
