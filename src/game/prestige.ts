import { PRESTIGE, type FateInfo } from './constants';
import { achievementBonuses } from './achievements';
import { remnantBonuses } from './economy';
import type { GameState, MetaState, Planet, Remnant } from './state';
import { createRunState, remnantCount } from './state';
import { fateFor } from './stellar';

export interface PrestigePrediction {
  fate: FateInfo;
  mass: number;
  yieldMetals: number;
  base: number;
  fateMult: number;
  dysonMult: number;
  escapedMult: number;
  bhMult: number;
  goldMult: number;
  achMult: number;
  escaping: Planet[];
  perishing: Planet[];
}

export function predictPrestige(s: GameState): PrestigePrediction {
  const mass = s.run.mass;
  const fate = fateFor(mass);
  const dysonPlanets = s.run.planets.filter((p) => p.tier >= 4).length;
  const rb = remnantBonuses(s.meta);
  const ach = achievementBonuses(s.meta);
  const base = PRESTIGE.BASE * Math.pow(Math.max(mass, 0), PRESTIGE.MASS_EXP);
  const fateMult = PRESTIGE.FATE_MULT[fate.id];
  const dysonMult = 1 + PRESTIGE.DYSON_BONUS * dysonPlanets;
  const escapedMult = 1 + PRESTIGE.ESCAPED_CIV_BONUS * Math.min(s.meta.escapedCivs, PRESTIGE.ESCAPED_CIV_CAP);
  const bhMult = rb.bhMetalMult;
  const goldMult = rb.goldMetalMult;
  const achMult = 1 + ach.metal;
  const yieldMetals = Math.max(1, Math.floor(base * fateMult * dysonMult * escapedMult * bhMult * goldMult * achMult));
  const escaping = s.run.planets.filter((p) => p.tier >= 3);
  const perishing = s.run.planets.filter((p) => p.tier === 2);
  return { fate, mass, yieldMetals, base, fateMult, dysonMult, escapedMult, bhMult, goldMult, achMult, escaping, perishing };
}

export function canPrestige(s: GameState): boolean {
  return s.run.phase === 'giant';
}

export interface PrestigeResult {
  fate: FateInfo;
  mass: number;
  yieldMetals: number;
  remnant: Remnant;
  escaped: number;
  runIndex: number;
}

let remnantSeq = 0;
function remnantId(now: number): string {
  remnantSeq = (remnantSeq + 1) % 1000;
  return `r${now.toString(36)}${remnantSeq.toString(36)}`;
}

export function performPrestige(s: GameState, now: number): PrestigeResult {
  const pred = predictPrestige(s);
  const meta = s.meta;
  meta.metals += pred.yieldMetals;
  meta.metalsEarnedTotal += pred.yieldMetals;
  const remnant: Remnant = {
    id: remnantId(now),
    kind: pred.fate.remnantKind,
    mass: pred.mass,
    metalsAtCreation: pred.yieldMetals,
    runIndex: s.run.runIndex,
    createdAt: now,
  };
  meta.remnants.push(remnant);
  meta.escapedCivs += pred.escaping.length;
  meta.totalPrestiges += 1;
  meta.bestMass = Math.max(meta.bestMass, pred.mass);
  meta.codex[pred.fate.remnantKind] = meta.codex[pred.fate.remnantKind] ?? now;
  const eventCodex = pred.fate.id === 'whiteDwarf' ? 'nebula' : 'supernova';
  meta.codex[eventCodex] = meta.codex[eventCodex] ?? now;
  s.stats.fatesSeen[pred.fate.id] = (s.stats.fatesSeen[pred.fate.id] ?? 0) + 1;
  const runIndex = s.run.runIndex + 1;
  s.run = createRunState(meta, runIndex, now);
  return { fate: pred.fate, mass: pred.mass, yieldMetals: pred.yieldMetals, remnant, escaped: pred.escaping.length, runIndex };
}

export function canKilonova(meta: MetaState): boolean {
  return remnantCount(meta, 'ns') >= 2;
}

export interface KilonovaResult {
  merged: [Remnant, Remnant];
  blackHole: Remnant;
  metals: number;
}

export function performKilonova(s: GameState, now: number): KilonovaResult | null {
  const meta = s.meta;
  if (!canKilonova(meta)) return null;
  const ns = meta.remnants.filter((r) => r.kind === 'ns').sort((a, b) => b.mass - a.mass);
  const a = ns[0]!;
  const b = ns[1]!;
  meta.remnants = meta.remnants.filter((r) => r !== a && r !== b);
  const bh: Remnant = {
    id: remnantId(now),
    kind: 'bh',
    mass: a.mass + b.mass,
    metalsAtCreation: a.metalsAtCreation + b.metalsAtCreation,
    runIndex: s.run.runIndex,
    createdAt: now,
    fromKilonova: true,
  };
  meta.remnants.push(bh);
  meta.goldRelics += 1;
  const metals = a.metalsAtCreation + b.metalsAtCreation;
  meta.metals += metals;
  meta.metalsEarnedTotal += metals;
  meta.codex.kilonova = meta.codex.kilonova ?? now;
  meta.codex.bh = meta.codex.bh ?? now;
  return { merged: [a, b], blackHole: bh, metals };
}

export function remnantBonusText(kind: Remnant['kind'], fromKilonova?: boolean): string {
  switch (kind) {
    case 'wd':
      return '광자 +5%';
    case 'ns':
      return '강착 +10%';
    case 'bh':
      return fromKilonova ? '금속 +15% · 황금 유물' : '금속 +15%';
  }
}
