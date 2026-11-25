import { $, escape } from '../core/utils.js';
import { user, page } from '../core/state.js';
import { go } from '../core/router.js';
import { avatar } from '../ui/components.js';
import { styledName, adminBadge } from '../ui/name-style.js';
import { toast } from '../ui/feedback.js';
import { searchPublic } from '../services/community.js';
import { userProfile, followList, searchUsers, follow, unfollow } from '../services/social.js';
import { modal } from '../ui/modal.js';
let requestId = 0;

function personButton(p) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'person';
  b.innerHTML = avatar({name: p.name, avatar: p.avatar}, true) + '<span class="person-name">' + escape(p.name) + '</span><span class="badge">' + escape(p.level) + '</span><span class="muted">' + escape(p.city || '') + '</span>';
  b.onclick = () => go('user', {id: p.user_id});
  return b;
}

// Pages through rows from fetcher(offset) into host. Used for follower lists and people search.
function listLoader(host, fetcher, pageSize) {
  host.textContent = '';
  const note = document.createElement('p'), list = document.createElement('div'), more = document.createElement('button');
  note.className = 'muted'; note.setAttribute('role', 'status'); list.className = 'people-list';
  more.type = 'button'; more.textContent = 'Daha fazla göster'; more.hidden = true;
  host.append(note, list, more);
  let offset = 0, busy = false;
  async function load() {
    if (busy) return; busy = true; more.disabled = true;
    note.textContent = offset ? '' : 'Yükleniyor…';
    try {
      const rows = await fetcher(offset);
      if (!host.isConnected) return;
      rows.forEach(r => list.append(personButton(r)));
      offset += rows.length;
      note.textContent = offset ? '' : 'Kimse bulunamadı.';
      more.textContent = 'Daha fazla göster'; more.hidden = rows.length < pageSize;
    } catch (e) {
      if (host.isConnected) { note.textContent = e.message; more.hidden = false; more.textContent = 'Tekrar dene'; }
    } finally { busy = false; more.disabled = false; }
  }
  more.onclick = load; void load();
}

export function mountFollowStats(host, ownerId, counts) {
  host.innerHTML = '<button type="button" aria-haspopup="dialog" data-kind="followers"><strong>–</strong><span>takipçi</span></button><button type="button" aria-haspopup="dialog" data-kind="following"><strong>–</strong><span>takip edilen</span></button>';
  const buttons=host.querySelectorAll('[data-kind]');
  buttons.forEach(b=>b.onclick=()=>openFollowDialog(ownerId,b.dataset.kind));
  const refresh=data=>buttons.forEach(b=>b.querySelector('strong').textContent=Number(data[b.dataset.kind]||0));
  if(counts)refresh(counts);
  return refresh;
}

function openFollowDialog(ownerId, kind) {
  modal('<div class="follow-dialog"><h2>Takip listeleri</h2><div class="actions social-tabs"><button type="button" data-kind="followers">Takipçiler</button><button type="button" data-kind="following">Takip edilenler</button></div><div class="people-host"></div><div class="actions"><button type="button" id="followClose">Kapat</button></div></div>', () => false);
  const tabs = $('modalBody').querySelectorAll('[data-kind]'), host = $('modalBody').querySelector('.people-host');
  const show = k => {
    tabs.forEach(x => {
      x.classList.toggle('active', x.dataset.kind === k);
      x.setAttribute('aria-pressed', String(x.dataset.kind === k));
    });
    const list=document.createElement('div');
    host.replaceChildren(list);
    listLoader(list, off => followList(ownerId, k, off), 50);
  };
  tabs.forEach(x => x.onclick = () => show(x.dataset.kind));
  host.addEventListener('click', e => { if (e.target.closest('.person')) $('dialog').close(); });
  $('followClose').onclick = () => $('dialog').close();
  show(kind);
}

export async function openUser(arg) {
  const request = ++requestId, id = arg?.id, view = $('view');
  if (id && id === user.id) { history.replaceState({page: 'profile'}, ''); go('profile', undefined, false); return; }
  view.innerHTML = '<p role="status">Profil yükleniyor…</p>';
  try {
    if (!id) throw Error('Profil bağlantısı eksik.');
    const p = await userProfile(id);
    if (page !== 'user' || request !== requestId) return;
    if (!p) throw Error('Kullanıcı bulunamadı.');
    draw(p, request);
  } catch (e) {
    if (page === 'user' && request === requestId) {
      view.innerHTML = `<div class="card"><p>${escape(e.message)}</p><button id="backExplore">Keşfet’e dön</button></div>`;
      $('backExplore').onclick = () => go('explore');
    }
  }
}

function draw(p, request) {
  const view = $('view'), state = {followers: Number(p.followers), following: Number(p.following)};
  let following = !!p.is_following;
  view.innerHTML = `<div class="banner profile-cover">${p.banner ? `<img src="${escape(p.banner)}" alt="Profil kapak görseli">` : ''}</div>
  <div class="profile-info">${avatar({name: p.name, avatar: p.avatar})}<div><h1 style="margin:0">${styledName(p.name,{color:p.name_color,glow:p.name_glow,anim:p.name_anim})}</h1>${p.is_admin?adminBadge(p.badge_color):''}<span class="badge">${escape(p.level)}</span> <span class="muted">${escape(p.city || 'Şehir belirtilmedi')}</span></div><div id="followStats" class="follow-stats"></div>${user.guest?'':'<button id="followBtn" class="primary"></button>'}</div>
  <div class="grid"><div class="card stat"><span class="muted">XP</span><strong>${Number(p.xp)}</strong></div><div class="card stat"><span class="muted">Çözülen içerik</span><strong>${Number(p.answered)}</strong></div><div class="card stat"><span class="muted">Paylaştığı set</span><strong>${Number(p.public_sets)}</strong></div></div>
  <p class="notice section">Seviye rozeti, etiketlenen ve tekrar edilen kelimelerden hesaplanan tahmini bir ilerleme göstergesidir; resmi CEFR sonucu değildir.</p>
  <div class="section"><h2>Paylaştığı çalışma setleri</h2><p class="muted">Yalnızca herkesle paylaşılan setler görünür.</p><div id="userSets" class="grid"></div><p id="userSetsStatus" role="status">Yükleniyor…</p><button id="userSetsMore" hidden>Daha fazla göster</button></div>
  <div class="section"><button id="backBoard">← Geri dön</button></div>`;
  const refreshCounts=mountFollowStats($('followStats'),p.user_id,state);
  if (!user.guest) {
    const btn=$('followBtn');
    const paint = () => { btn.textContent = following ? 'Takibi bırak' : 'Takip et'; btn.classList.toggle('primary', !following); };
    paint();
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        if (following) await unfollow(p.user_id); else await follow(p.user_id);
        following = !following; state.followers += following ? 1 : -1;
        if (page === 'user' && request === requestId) { paint(); refreshCounts(state); }
        toast(following ? 'Takip ediliyor.' : 'Takip bırakıldı.');
      } catch (e) { toast(e.message); }
      finally { if (btn.isConnected) btn.disabled = false; }
    };
  }
  $('backBoard').onclick = () => history.back();
  const results = $('userSets'), status = $('userSetsStatus'), more = $('userSetsMore');
  const alive = () => page === 'user' && request === requestId && $('userSets') === results;
  let offset = 0, busy = false;
  async function load() {
    if (busy) return; busy = true; more.disabled = true;
    try {
      const rows = await searchPublic('', p.user_id, offset);
      if (!alive()) return;
      for (const row of rows) {
        const card = document.createElement('article'); card.className = 'card public-set';
        card.innerHTML = `<span class="ico">▱</span><h2>${escape(row.title)}</h2><p class="muted">${row.item_count} içerik · ${escape((row.levels || []).join(' · '))}</p><button class="primary open-set">Seti aç</button>`;
        card.querySelector('.open-set').onclick = () => go('shared', {owner: row.owner_id, id: row.set_id});
        results.append(card);
      }
      offset += rows.length;
      status.textContent = offset ? '' : 'Henüz paylaşılan set yok.';
      more.textContent = 'Daha fazla göster'; more.hidden = rows.length < 24;
    } catch (e) { if (alive()) { status.textContent = e.message; more.hidden = false; more.textContent = 'Tekrar dene'; } }
    finally { busy = false; if (alive()) more.disabled = false; }
  }
  more.onclick = load; void load();
}

// "Kişileri bul" box for the Keşfet page.
export const peopleSearchMarkup = () => '<section class="card section" id="peopleSearch"><h2>Kişileri bul</h2><p class="muted">Kullanıcı adıyla ara, profiline gir ve takip et.</p><form id="peopleForm" class="actions"><input id="peopleQuery" maxlength="35" placeholder="Kullanıcı adı" autocomplete="off"><button class="primary">Kişi ara</button></form><div id="peopleResults" aria-live="polite"></div></section>';
export function bindPeopleSearch() {
  const form = $('peopleForm'); if (!form) return;
  form.onsubmit = e => {
    e.preventDefault();
    const q = $('peopleQuery').value.trim(), host = $('peopleResults');
    if (user.guest) { host.textContent = 'Kişi aramak için hesapla giriş yap.'; return; }
    if (q.length < 2) { host.textContent = 'En az 2 karakter yaz.'; return; }
    listLoader(host, off => searchUsers(q, off), 24);
  };
}
