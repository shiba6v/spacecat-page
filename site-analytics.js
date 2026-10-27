/* Website analytics: consent first; no app content, form fields or personal IDs. */
(() => {
  'use strict';
  const script = document.currentScript;
  const id = script && script.dataset.measurementId;
  const app = script && script.dataset.app;
  const root = script && script.dataset.siteRoot;
  if (!/^G-[A-Z0-9]+$/.test(id || '') || !app || !root || window.__siteAnalyticsInstalled) return;
  window.__siteAnalyticsInstalled = true;
  const key = 'site-analytics-consent:' + app + ':v1';
  const ja = (document.documentElement.lang || 'ja').toLowerCase().startsWith('ja');
  const labels = ja ? {
    title: 'アクセス解析について',
    text: 'この公式サイトでは、Google Analyticsで閲覧状況とApp Storeリンクのクリックを集計します。許可した場合にのみCookieを使って計測します。アプリ内の写真・名刺・学習内容は送信しません。',
    accept: '許可する', reject: '許可しない', settings: 'アクセス解析の設定', policy: 'Googleのプライバシーポリシー'
  } : {
    title: 'Website analytics',
    text: 'With your permission, this website uses Google Analytics cookies to measure page visits and App Store link clicks. Photos, business cards and learning content inside the app are not sent.',
    accept: 'Allow', reject: 'Do not allow', settings: 'Analytics settings', policy: 'Google Privacy Policy'
  };
  let choice = null, started = false, panel, settings;
  try { choice = localStorage.getItem(key); } catch (_) { /* Session-only consent if storage is unavailable. */ }
  function cleanUrl(value) {
    try { const u = new URL(value); return u.origin + u.pathname; } catch (_) { return ''; }
  }
  function tag() { window.dataLayer.push(arguments); }
  function start() {
    if (started || choice !== 'granted') return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = tag;
    tag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    tag('js', new Date());
    const config = { send_page_view: true, cookie_path: root, cookie_domain: location.hostname, cookie_prefix: app.replace(/[^a-z0-9]/g, '_'), allow_google_signals: false, allow_ad_personalization_signals: false, page_location: cleanUrl(location.href), page_referrer: cleanUrl(document.referrer) };
    // Preserve only explicit marketing campaign fields, never arbitrary query strings.
    const params = new URLSearchParams(location.search);
    for (const [query, field] of [['utm_source','campaign_source'],['utm_medium','campaign_medium'],['utm_campaign','campaign_name']]) {
      const value = params.get(query);
      if (value && /^[a-zA-Z0-9_. -]{1,80}$/.test(value)) config[field] = value;
    }
    tag('config', id, config);
    const google = document.createElement('script');
    google.async = true;
    google.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(google);
  }
  function clearCookies() {
    const prefixes = [app.replace(/[^a-z0-9]/g, '_') + '_ga'];
    document.cookie.split(';').forEach(part => {
      const name = part.split('=')[0].trim();
      if (!prefixes.some(prefix => name.startsWith(prefix))) return;
      const paths = new Set([root, root.replace(/\/$/, '') || '/', '/']);
      const domains = ['', location.hostname, '.' + location.hostname];
      for (const path of paths) for (const domain of domains) document.cookie = name + '=; Max-Age=0; path=' + path + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
    });
  }
  function choose(value) {
    const wasStarted = started;
    choice = value;
    try { localStorage.setItem(key, value); } catch (_) {}
    panel.hidden = true;
    settings.focus();
    if (value === 'granted') start();
    else {
      window['ga-disable-' + id] = true;
      clearCookies();
      if (wasStarted) location.reload();
    }
  }
  function button(text, action) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.addEventListener('click', action); return b;
  }
  function mount() {
    const style = document.createElement('style');
    style.textContent = '#site-analytics-panel{box-sizing:border-box;position:fixed;z-index:10000;bottom:16px;left:16px;right:16px;max-width:580px;padding:18px;background:#fff;color:#172033;border:1px solid #a7b0bf;border-radius:14px;box-shadow:0 6px 30px #0002;font:14px/1.6 system-ui,sans-serif;text-align:left}#site-analytics-panel[hidden]{display:none}#site-analytics-panel strong{font-size:16px}#site-analytics-panel p{margin:8px 0}#site-analytics-panel a{color:#1747a6;text-decoration:underline}#site-analytics-panel button{font:inherit;border:1px solid #68758a;border-radius:7px;background:#f8fafc;color:#172033;padding:8px 16px;margin:10px 8px 0 0;cursor:pointer}#site-analytics-panel button:focus-visible,#site-analytics-settings:focus-visible{outline:3px solid #2563eb;outline-offset:3px}#site-analytics-settings{display:block;margin:18px auto;padding:8px 12px;font:12px/1.4 system-ui,sans-serif;background:transparent;color:inherit;border:1px solid currentColor;border-radius:5px;cursor:pointer}';
    document.head.appendChild(style);
    panel = document.createElement('section'); panel.id = 'site-analytics-panel'; panel.setAttribute('aria-label', labels.title); panel.hidden = choice !== null;
    const title = document.createElement('strong'); title.textContent = labels.title;
    const text = document.createElement('p'); text.textContent = labels.text;
    const policy = document.createElement('a'); policy.href = 'https://policies.google.com/privacy'; policy.textContent = labels.policy; policy.target = '_blank'; policy.rel = 'noopener noreferrer';
    const buttons = document.createElement('div');
    buttons.append(button(labels.accept, () => { window['ga-disable-' + id] = false; choose('granted'); }), button(labels.reject, () => choose('denied')));
    panel.append(title, text, policy, buttons);
    settings = button(labels.settings, () => { panel.hidden = false; buttons.querySelector('button').focus(); }); settings.id = 'site-analytics-settings';
    document.body.append(settings, panel);
    start();
  }
  document.addEventListener('click', event => {
    if (choice !== 'granted' || !started) return;
    const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!target) return;
    let url; try { url = new URL(target.href); } catch (_) { return; }
    if (url.hostname !== 'apps.apple.com') return;
    const placement = target.closest('footer') ? 'footer' : target.closest('header,nav') ? 'header' : target.closest('.hero,#hero') ? 'hero' : 'body';
    tag('event', 'app_store_click', { send_to: id, app_name: app, link_placement: placement, page_language: document.documentElement.lang || 'ja', destination_host: url.hostname, transport_type: 'beacon' });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
