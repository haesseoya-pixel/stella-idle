import type { Game } from '@/app/game';
import { isMobile } from './dom';

interface Hint {
  id: string;
  text: () => string;
  when: (g: Game) => boolean;
  done: (g: Game) => boolean;
  minShow: number;
}

const HINTS: Hint[] = [
  {
    id: 'click',
    text: () => (isMobile() ? '별을 탭해서 수소를 모으세요' : '별을 클릭해서 수소를 모으세요'),
    when: (g) => g.state.run.phase === 'cloud' && g.state.run.runIndex === 1,
    done: (g) => g.state.stats.totalClicks >= 8,
    minShow: 0,
  },
  {
    id: 'ignite',
    text: () => '0.08 M☉에 이르면 핵융합이 시작됩니다. 계속 먹이세요!',
    when: (g) => g.state.run.phase === 'cloud' && g.state.stats.totalClicks >= 8 && g.state.run.runIndex === 1,
    done: (g) => g.state.run.phase !== 'cloud',
    minShow: 0,
  },
  {
    id: 'firstUpgrade',
    text: () => (isMobile() ? '점화 성공! 아래 패널에서 첫 업그레이드를 사 보세요' : '점화 성공! 오른쪽 패널에서 첫 업그레이드를 사 보세요'),
    when: (g) => g.state.run.phase === 'main' && g.state.run.photons >= 10,
    done: (g) => Object.values(g.state.run.upgrades).some((v) => v > 0),
    minShow: 4,
  },
  {
    id: 'fuel',
    text: () => '연료 게이지가 줄어듭니다. 무거운 별일수록 빨리 타지만, 더 많이 남깁니다',
    when: (g) => g.state.run.phase === 'main' && g.state.run.fuel < 0.9 && g.state.run.runIndex === 1,
    done: (g) => g.state.run.fuel < 0.8 || g.state.run.phase !== 'main',
    minShow: 6,
  },
  {
    id: 'giant',
    text: () => '적색 거성! 질량은 고정되고 광자는 ×3. 준비되면 운명 맞이하기를 누르세요',
    when: (g) => g.state.run.phase === 'giant' && g.state.meta.totalPrestiges === 0,
    done: (g) => g.state.run.phase !== 'giant',
    minShow: 8,
  },
  {
    id: 'metals',
    text: () => '금속을 얻었습니다! 유산 탭에서 영구 강화를 구매하세요',
    when: (g) => g.state.meta.totalPrestiges === 1 && g.state.meta.metals > 0,
    done: (g) => Object.values(g.state.meta.metalUpgrades).some((v) => v > 0),
    minShow: 6,
  },
];

export class Tutorial {
  private game: Game;
  private el: HTMLElement;
  private current: Hint | null = null;
  private shownAt = 0;

  constructor(game: Game, el: HTMLElement) {
    this.game = game;
    this.el = el;
  }

  update(nowSec: number): void {
    const g = this.game;
    const seen = g.state.meta.tutorialSeen;
    if (this.current) {
      const c = this.current;
      const elapsed = nowSec - this.shownAt;
      if (c.done(g) && elapsed >= c.minShow) {
        g.markTutorial(c.id);
        this.current = null;
        this.el.hidden = true;
      } else if (!c.when(g) && !c.done(g) && elapsed >= c.minShow) {
        this.current = null;
        this.el.hidden = true;
      } else {
        return;
      }
    }
    for (const hint of HINTS) {
      if (seen.includes(hint.id)) continue;
      if (hint.done(g)) {
        g.markTutorial(hint.id);
        continue;
      }
      if (hint.when(g)) {
        this.current = hint;
        this.shownAt = nowSec;
        this.el.textContent = hint.text();
        this.el.hidden = false;
        return;
      }
    }
  }
}
