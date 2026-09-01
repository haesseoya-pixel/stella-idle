import './styles/main.css';
import { Game } from './app/game';
import { Ambient } from './audio/ambient';
import { Synth } from './audio/synth';
import { ACHIEVEMENT_BY_ID } from './game/achievements';
import { CODEX_INFO, OFFLINE, STELLAR_TYPES, TIER_NAMES } from './game/constants';
import { typeById } from './game/stellar';
import { Scene } from './render/scene';
import { h, isMobile, qs, setNumberMode } from './ui/dom';
import { Hud } from './ui/hud';
import { Modals } from './ui/modals';
import { Panels } from './ui/panels';
import { Toasts } from './ui/toast';
import { Tutorial } from './ui/tutorial';
import { formatMass, formatTime } from './util/format';
import { N } from './ui/dom';
import { getPlayerName, submitScore } from './rank/leaderboard';
import { currentScores } from './ui/tabs/rankTab';

const game = new Game();
setNumberMode(game.state.settings.numberFormat);
document.body.classList.toggle('reduced', game.state.settings.reducedMotion);

const synth = new Synth();
synth.volume = game.state.settings.volume;
synth.enabled = game.state.settings.sound;
const ambient = new Ambient(synth);
ambient.enabled = game.state.settings.ambient;

const canvas = qs<HTMLCanvasElement>('#scene');
const sceneWrap = qs('#sceneWrap');
const scene = new Scene(canvas, game);
const toasts = new Toasts(qs('#toasts'));
const modals = new Modals(qs('#modalRoot'), game, toasts);
const hud = new Hud(qs('#hud'), qs('#fateWrap'), game, () => modals.openPrestige());
// ---- global ranking (Firestore via REST) ------------------------------------
let lastSubmitted = { mass: 0, metals: 0 };
async function submitRanks(force = false): Promise<string> {
  const name = getPlayerName();
  if (!name) return '닉네임을 먼저 저장하세요';
  const sc = currentScores(game);
  if (!force && sc.mass <= lastSubmitted.mass * 1.02 && sc.metals <= lastSubmitted.metals) return '변동 없음';
  const meta = { mass: sc.mass, metals: sc.metals, prestiges: sc.prestiges };
  const [a, b] = await Promise.all([submitScore('stella-mass', 'stella', sc.mass, meta, name), submitScore('stella-metals', 'stella', sc.metals, meta, name)]);
  if (a === 'error' || b === 'error') return '랭킹 서버에 연결할 수 없습니다';
  lastSubmitted = { mass: sc.mass, metals: sc.metals };
  return a === 'lower' && b === 'lower' ? '기존 기록이 더 높아 그대로입니다' : '랭킹에 등록했습니다';
}
const panels = new Panels(game, {
  openSettings: () => modals.openSettings(),
  openPrestige: () => modals.openPrestige(),
  openKilonova: () => modals.openKilonova(),
  rank: { submitNow: () => submitRanks(true) },
});
game.events.on('prestige', () => void submitRanks());
game.events.on('kilonova', () => void submitRanks());
window.setInterval(() => void submitRanks(), 60000);
const tutorial = new Tutorial(game, qs('#hint'));

if (!game.storageOk) qs('#storageWarn').hidden = false;
if (game.loadCorrupt) toasts.show('저장 데이터를 읽을 수 없어 새로 시작합니다', 'warn');

// ---- audio unlock on first gesture -----------------------------------------
const unlock = () => {
  synth.unlock();
  const run = game.state.run;
  ambient.setType(run.phase === 'giant' ? 'giant' : game.rates.type.id);
};
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

// ---- game events → feedback -------------------------------------------------
const bootAt = performance.now();
game.events.on('game', (e) => {
  switch (e.type) {
    case 'ignite':
      toasts.show('핵융합 시작. 이제 광자로 별을 강화할 수 있습니다.', 'milestone', '점화!');
      synth.ignition();
      break;
    case 'typeChange': {
      const t = typeById(e.to);
      const up = typeById(e.from).order < t.order;
      toasts.show(t.flavor, 'milestone', `${t.name}${up ? '이(가) 되었습니다' : '(으)로 돌아갔습니다'}`);
      synth.typeChange(t.order);
      break;
    }
    case 'giant':
      toasts.show('질량은 고정되고 광자는 ×3. 준비되면 운명을 맞이하세요.', 'milestone', '적색 거성 진입!', 6000);
      synth.giant();
      break;
    case 'civTier': {
      const p = e.planet;
      const civ = p.civName ? `『${p.civName}』` : p.name;
      const msg =
        e.tier === 1
          ? `${p.name}에 미생물이 나타났습니다.`
          : e.tier === 2
            ? `${civ}이(가) 당신을 신으로 섬기기 시작했습니다.`
            : e.tier === 3
              ? `${civ}이(가) 우주로 나아갑니다. 별이 죽어도 살아남을 것입니다.`
              : `${civ}이(가) 다이슨 스웜을 완성했습니다! 빛을 수확합니다.`;
      toasts.show(msg, 'milestone', TIER_NAMES[e.tier], 5000);
      synth.civ(e.tier);
      break;
    }
    case 'tribute':
      toasts.show(`${e.count > 1 ? `문명 ${e.count}곳이` : `『${e.civName}』이(가)`} 공물을 바쳤습니다: +${N(e.amount)} 광자`, 'info', '공물');
      synth.tribute();
      break;
    case 'achievement': {
      const a = ACHIEVEMENT_BY_ID[e.id];
      toasts.show(`${a.name} — ${a.reward}`, 'achievement', '업적 달성');
      synth.achievement();
      break;
    }
    case 'codex':
      if (performance.now() - bootAt > 2000) toasts.show(CODEX_INFO[e.id].name, 'info', '도감 등록');
      break;
  }
});
game.events.on('purchase', (p) => {
  if (p.kind === 'planet') synth.planet();
  else synth.purchase(p.count);
});
game.events.on('cannotAfford', () => synth.cannotAfford());
game.events.on('prestige', (r) => {
  if (r.fate.remnantKind === 'wd') synth.nebula();
  else synth.supernova();
  window.setTimeout(() => toasts.show(`${r.fate.name}이(가) 남았습니다. +${N(r.yieldMetals)} 금속. 새 성운이 피어납니다.`, 'milestone', `${formatMass(r.mass)}의 별, ${r.fate.event}`, 6000), 1500);
});
game.events.on('kilonova', (r) => {
  synth.kilonova();
  window.setTimeout(() => toasts.show(`블랙홀 ${formatMass(r.blackHole.mass)} + 황금 유물. 금속 +${N(r.metals)} 회수.`, 'milestone', '킬로노바!', 6000), 1200);
});
game.events.on('offline', (r) => {
  if (r.elapsed >= OFFLINE.MODAL_THRESHOLD) modals.openOffline(r);
  else if (r.elapsed >= OFFLINE.TOAST_THRESHOLD) toasts.show(`부재 중 ${formatTime(r.elapsed)}: +${N(r.photons)} 광자`, 'info');
});
game.events.on('settings', ({ key }) => {
  const s = game.state.settings;
  if (key === 'volume') synth.setVolume(s.volume);
  if (key === 'sound') synth.setEnabled(s.sound);
  if (key === 'ambient') ambient.setEnabled(s.ambient);
  if (key === 'numberFormat') setNumberMode(s.numberFormat);
  if (key === 'reducedMotion') document.body.classList.toggle('reduced', s.reducedMotion);
});
game.events.on('replaced', () => {
  setNumberMode(game.state.settings.numberFormat);
  document.body.classList.toggle('reduced', game.state.settings.reducedMotion);
  synth.setVolume(game.state.settings.volume);
  synth.setEnabled(game.state.settings.sound);
  ambient.setEnabled(game.state.settings.ambient);
  panels.show(panels.active);
});

// ---- clicking the star ------------------------------------------------------
let floatCount = 0;
game.events.on('click', ({ mass, photons, x, y }) => {
  if (photons > 0) synth.giantClick();
  else synth.click();
  if (floatCount > 12) return;
  floatCount++;
  const label = photons > 0 ? `+${N(photons)} 광자` : `+${mass < 0.001 ? mass.toFixed(4) : mass.toFixed(3)} M☉`;
  const el = h('div', { class: 'flash-num', text: label, style: `left:${x}px;top:${y}px` });
  sceneWrap.append(el);
  window.setTimeout(() => {
    el.remove();
    floatCount--;
  }, 900);
});
sceneWrap.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (modals.isOpen) return;
  if (scene.effects.blocking) {
    scene.effects.skipSequence();
    return;
  }
  const rect = sceneWrap.getBoundingClientRect();
  game.click(e.clientX - rect.left, e.clientY - rect.top);
});
sceneWrap.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (modals.isOpen) return;
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    if (scene.effects.blocking) scene.effects.skipSequence();
    else game.click(scene.cx, scene.cy);
  }
});

// ---- lifecycle --------------------------------------------------------------
window.addEventListener('resize', () => scene.resize());
window.addEventListener('orientationchange', () => window.setTimeout(() => scene.resize(), 120));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.save();
    synth.suspend();
  } else {
    synth.resume();
  }
});
window.addEventListener('pagehide', () => game.save());
window.addEventListener('beforeunload', () => game.save());

// ---- per-frame UI -----------------------------------------------------------
let panelAcc = 0;
let cssAcc = 0;
let ambientAcc = 0;
game.onFrame((dt, ts) => {
  scene.frame(dt, ts);
  hud.update(dt);
  panelAcc += dt;
  if (panelAcc >= 0.1) {
    panelAcc = 0;
    panels.update();
    tutorial.update(ts / 1000);
  }
  cssAcc += dt;
  if (cssAcc >= 0.2) {
    cssAcc = 0;
    const c = scene.starColor;
    document.documentElement.style.setProperty('--star-rgb', `${c[0]}, ${c[1]}, ${c[2]}`);
    document.documentElement.style.setProperty('--star', `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
  }
  ambientAcc += dt;
  if (ambientAcc >= 0.5) {
    ambientAcc = 0;
    if (synth.ready) ambient.setType(game.state.run.phase === 'giant' ? 'giant' : game.rates.type.id);
  }
});

game.boot();
if (game.loadedFresh && !game.loadCorrupt) {
  toasts.show(isMobile() ? '별을 탭해서 수소를 모으세요.' : '별을 클릭해서 수소를 모으세요. 스페이스바도 됩니다.', 'info', '성운에서 시작', 5000);
}
game.start();

// expose for debugging in dev
if (import.meta.env.DEV) (window as unknown as { stella: unknown }).stella = { game, scene, synth, panels, modals, STELLAR_TYPES };
