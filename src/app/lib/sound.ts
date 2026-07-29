/**
 * 効果音。**音声ファイルは持たず、Web Audio で合成する。**
 *
 * ドット絵を手続き的に描いているのと同じ理由で、素材を増やして外部依存を作りたくない
 * （フォントを自前ホストに切り替えた経緯と同じ）。数十行のコードで足りる。
 *
 * `AudioContext` は**最初に音を鳴らす瞬間まで作らない**。読み込み直後に作ると
 * ブラウザの自動再生ポリシーで suspended のまま始まり、警告も出る。
 * 音が鳴るきっかけは必ずタップなので、そこで作れば必ずユーザー操作の中に入る。
 */

/** 全体の音量。クリッカーは音が鳴る回数が多いので、控えめに始める */
const MASTER_GAIN = 0.09;

let context: AudioContext | null = null;
let muted = false;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;

  if (!context) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  // タブを離れて戻ると suspended のままになることがある
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * 単音を1つ鳴らす。
 * 減衰は指数で落とす（線形だと切れ際が「ブツッ」と鳴る）。
 */
function tone(
  frequency: number,
  seconds: number,
  type: OscillatorType,
  gain: number,
  delay = 0
): void {
  const ctx = audio();
  if (!ctx) return;

  const at = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  amp.gain.setValueAtTime(gain * MASTER_GAIN, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + seconds);
}

/** 音を出すかどうか。UI のトグルから呼ぶ */
export function setMuted(value: boolean): void {
  muted = value;
}

/**
 * 着工のタップ。
 * @param progress 着工ゲージの進み具合(0〜1)。竣工が近いほど高くなる
 */
export function playTap(progress: number): void {
  const step = Math.round(Math.min(1, Math.max(0, progress)) * 12);
  // 半音ずつ上げる。連打すると音階が上がっていき、竣工の近さが耳で分かる
  tone(220 * 2 ** (step / 12), 0.07, "square", 0.5);
}

/** 事業の取得 */
export function playBuy(): void {
  tone(440, 0.09, "triangle", 0.8);
  tone(660, 0.14, "triangle", 0.7, 0.07);
}

/** 竣工。上昇する3音 */
export function playCompletion(): void {
  [523.25, 659.25, 783.99].forEach((f, i) => {
    tone(f, 0.24, "triangle", 0.9, i * 0.07);
  });
}

/** 段階到達（東京・日本・世界）。竣工より派手に、少し長く */
export function playArrival(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(f, 0.42, "triangle", 1, i * 0.1);
  });
  tone(261.63, 0.6, "sine", 1, 0.3);
}
