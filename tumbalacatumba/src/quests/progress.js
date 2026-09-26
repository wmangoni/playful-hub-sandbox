import { QUESTS, ITEMS, XP_TABLE } from './data.js';

const SAVE_KEY = 'tumbalacatumba-save-v1';

/** Estado do jogador: nível, XP, dinheiro, mochila, missões e marcos da história. */
export class Progress {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.money = 0;
    this.bag = [{ id: 'pedra', count: 1 }];
    this.quests = {};
    this.flags = {};
    this.tracked = new Set();
    this.listeners = new Set();
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(type, data) {
    for (const fn of this.listeners) fn(type, data);
  }

  quest(id) {
    return QUESTS.find((q) => q.id === id);
  }
  status(id) {
    const st = this.quests[id];
    if (st) return st.status;
    return this.isAvailable(id) ? 'available' : 'unavailable';
  }
  isAvailable(id) {
    if (this.quests[id]) return false;
    const q = this.quest(id);
    if ((q.minLevel ?? 1) > this.level) return false;
    return (q.requires ?? []).every((r) => this.quests[r]?.status === 'done');
  }
  isActive(id) {
    const s = this.quests[id]?.status;
    return s === 'active' || s === 'complete';
  }
  count(id, key) {
    return this.quests[id]?.counts?.[key] ?? 0;
  }

  accept(id) {
    const q = this.quest(id);
    if (!this.isAvailable(id)) return;
    const st = { status: 'active', counts: {} };
    for (const o of q.objectives) st.counts[o.key] = q.startItem ? o.need : 0;
    this.quests[id] = st;
    this.tracked.add(id);
    if (q.startItem) this.addItem(q.startItem, 1, true);
    this.emit('accept', q);
    this._checkComplete(id);
    this.save();
  }

  abandon(id) {
    const q = this.quest(id);
    if (!this.isActive(id)) return;
    delete this.quests[id];
    this.tracked.delete(id);
    if (q.startItem) this.removeItem(q.startItem);
    this.emit('abandon', q);
    this.save();
  }

  /** alguma missão ativa ainda precisa desse objetivo? */
  wants(key) {
    for (const q of QUESTS) {
      const st = this.quests[q.id];
      if (st?.status !== 'active') continue;
      const o = q.objectives.find((ob) => ob.key === key);
      if (o && st.counts[key] < o.need) return true;
    }
    return false;
  }

  progress(key, n = 1) {
    for (const q of QUESTS) {
      const st = this.quests[q.id];
      if (st?.status !== 'active') continue;
      const o = q.objectives.find((ob) => ob.key === key);
      if (!o) continue;
      const before = st.counts[key];
      st.counts[key] = Math.min(o.need, before + n);
      if (st.counts[key] !== before) {
        this.emit('progress', { q, o, count: st.counts[key] });
        this._checkComplete(q.id);
        this.save();
        return true;
      }
    }
    return false;
  }

  _checkComplete(id) {
    const q = this.quest(id);
    const st = this.quests[id];
    if (st.status !== 'active') return;
    if (q.objectives.every((o) => st.counts[o.key] >= o.need)) {
      st.status = 'complete';
      this.emit('ready', q);
    }
  }

  turnIn(id) {
    const q = this.quest(id);
    const st = this.quests[id];
    if (!st || st.status !== 'complete') return false;
    st.status = 'done';
    this.tracked.delete(id);
    if (q.startItem) this.removeItem(q.startItem);
    const before = QUESTS.filter((x) => this.isAvailable(x.id)).map((x) => x.id);
    if (q.rewards.money) this.addMoney(q.rewards.money);
    for (const it of q.rewards.items ?? []) this.addItem(it, 1);
    this.emit('turnin', q);
    if (q.rewards.xp) this.addXP(q.rewards.xp);
    const after = QUESTS.filter((x) => this.isAvailable(x.id) && !before.includes(x.id));
    if (after.length) this.emit('newquests', after);
    this.save();
    return true;
  }

  get xpNeeded() {
    return XP_TABLE[this.level] ?? 99999;
  }

  addXP(n) {
    this.xp += n;
    this.emit('xp', n);
    while (this.level < XP_TABLE.length - 1 && this.xp >= XP_TABLE[this.level]) {
      const before = QUESTS.filter((x) => this.isAvailable(x.id)).map((x) => x.id);
      this.xp -= XP_TABLE[this.level];
      this.level++;
      this.emit('levelup', this.level);
      const after = QUESTS.filter((x) => this.isAvailable(x.id) && !before.includes(x.id));
      if (after.length) this.emit('newquests', after);
    }
  }

  addMoney(c) {
    this.money += c;
    this.emit('money', c);
  }

  addItem(id, n = 1, silent = false) {
    const it = this.bag.find((b) => b.id === id);
    if (it) it.count += n;
    else this.bag.push({ id, count: n });
    this.emit('item', { id, n, silent, def: ITEMS[id] });
  }
  removeItem(id, n = 1) {
    const i = this.bag.findIndex((b) => b.id === id);
    if (i < 0) return;
    this.bag[i].count -= n;
    if (this.bag[i].count <= 0) this.bag.splice(i, 1);
    this.emit('bag');
  }
  hasItem(id) {
    return this.bag.some((b) => b.id === id);
  }

  /** marcador sobre o PNJ: 'ready' (? amarelo), 'avail' (! amarelo), 'wip' (? cinza) ou null */
  markerFor(npcId) {
    let avail = false, wip = false;
    for (const q of QUESTS) {
      const s = this.status(q.id);
      if (q.turnIn === npcId && s === 'complete') return 'ready';
      if (q.giver === npcId && s === 'available') avail = true;
      if (q.turnIn === npcId && s === 'active') wip = true;
    }
    return avail ? 'avail' : wip ? 'wip' : null;
  }

  activeQuests() {
    return QUESTS.filter((q) => this.isActive(q.id));
  }

  setFlag(k, v = true) {
    this.flags[k] = v;
    this.emit('flag', { k, v });
    this.save();
  }

  // ----- salvar / carregar -----
  serialize(extra = {}) {
    return JSON.stringify({
      v: 1, level: this.level, xp: this.xp, money: this.money, bag: this.bag, quests: this.quests,
      flags: this.flags, tracked: [...this.tracked], ...extra,
    });
  }
  save() {
    if (this.noSave) return;
    try {
      const extra = this.extraSave ? this.extraSave() : {};
      localStorage.setItem(SAVE_KEY, this.serialize(extra));
    } catch {
      /* armazenamento indisponível */
    }
  }
  static hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }
  static clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* nada */
    }
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      this.level = d.level ?? 1;
      this.xp = d.xp ?? 0;
      this.money = d.money ?? 0;
      this.bag = d.bag ?? this.bag;
      this.quests = d.quests ?? {};
      this.flags = d.flags ?? {};
      this.tracked = new Set(d.tracked ?? []);
      return d;
    } catch {
      return null;
    }
  }
}
