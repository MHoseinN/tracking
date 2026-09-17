<template>
  <section class="financial-overview" aria-label="خلاصه آمار مالی">
    <div class="financial-overview__top">
      <article class="financial-overview__hero-card financial-overview__primary">
        <div class="financial-overview__hero-copy">
          <span class="financial-overview__icon financial-overview__icon--glass">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19V9m6 10V5m6 14v-7m4 7V3" stroke-linecap="round" />
            </svg>
          </span>
          <div>
            <p class="financial-overview__eyebrow">{{ primaryLabel }}</p>
            <p class="financial-overview__hero-value">{{ primaryValue }}</p>
            <p class="financial-overview__hero-meta financial-overview__primary-meta">{{ primaryMeta || '\u00a0' }}</p>
          </div>
        </div>
        <div class="financial-overview__ring financial-overview__ring--primary" :style="primaryRingStyle">
          <div>
            <strong>{{ normalizedPrimaryPercent }}٪</strong>
            <span>{{ primaryPercentLabel }}</span>
          </div>
        </div>
      </article>

      <article class="financial-overview__hero-card financial-overview__danger">
        <div class="financial-overview__hero-copy">
          <span class="financial-overview__icon financial-overview__icon--danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 7.5h14A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H5.5A2.5 2.5 0 0 1 3 17V6a2.5 2.5 0 0 1 2.5-2.5H17" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M15 12h6v4h-6a2 2 0 0 1 0-4Z" />
            </svg>
          </span>
          <div>
            <p class="financial-overview__eyebrow">{{ dangerLabel }}</p>
            <p class="financial-overview__hero-value financial-overview__danger-value">{{ dangerValue }}</p>
            <p class="financial-overview__hero-meta financial-overview__danger-meta">{{ dangerMeta || '\u00a0' }}</p>
          </div>
        </div>
        <div class="financial-overview__ring" :style="ringStyle">
          <div>
            <strong>{{ normalizedDangerPercent }}٪</strong>
            <span>{{ dangerPercentLabel }}</span>
          </div>
        </div>
      </article>
    </div>

    <div class="financial-overview__bottom">
      <article v-for="(item, index) in items" :key="`${item.label}-${index}`" class="financial-overview__mini">
        <span class="financial-overview__mini-icon" :class="`financial-overview__mini-icon--${item.tone || 'blue'}`">
          <svg v-if="item.icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <svg v-else-if="item.icon === 'crown'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 6 4.5 5L12 4l4.5 7L21 6l-2 12H5L3 6Zm3 15h12" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <svg v-else-if="item.icon === 'box'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m21 8-9 5-9-5m9 5v9M4.5 5.5 12 2l7.5 3.5A2.5 2.5 0 0 1 21 7.8v8.4a2.5 2.5 0 0 1-1.5 2.3L12 22l-7.5-3.5A2.5 2.5 0 0 1 3 16.2V7.8a2.5 2.5 0 0 1 1.5-2.3Z" stroke-linejoin="round" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke-linejoin="round" /><path d="M14 3v5h5M9 13h6M9 17h6" stroke-linecap="round" /></svg>
        </span>
        <div>
          <p>{{ item.label }}</p>
          <strong :class="`financial-overview__mini-value--${item.tone || 'blue'}`">{{ item.value }}</strong>
          <small v-if="item.meta">{{ item.meta }}</small>
        </div>
      </article>

      <article v-if="statusItems.length" class="financial-overview__status">
        <div class="financial-overview__status-title">
          <span class="financial-overview__status-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" stroke-linecap="round" /></svg>
          </span>
          <strong>{{ statusTitle }}</strong>
        </div>
        <div class="financial-overview__status-grid">
          <div v-for="status in statusItems" :key="status.label" class="financial-overview__status-item">
            <div><span>{{ status.label }}</span><strong :class="`is-${status.tone || 'success'}`">{{ status.value }}</strong></div>
            <div class="financial-overview__bar"><i :class="`is-${status.tone || 'success'}`" :style="{ width: `${normalizePercent(status.percent)}%` }" /></div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  primaryLabel: { type: String, required: true },
  primaryValue: { type: String, required: true },
  primaryMeta: { type: String, default: '' },
  primaryPercent: { type: Number, default: 0 },
  primaryPercentLabel: { type: String, default: 'دریافت‌شده' },
  dangerLabel: { type: String, required: true },
  dangerValue: { type: String, required: true },
  dangerMeta: { type: String, default: '' },
  dangerPercent: { type: Number, default: 0 },
  dangerPercentLabel: { type: String, default: 'در انتظار' },
  items: { type: Array, default: () => [] },
  statusTitle: { type: String, default: 'وضعیت فاکتورها' },
  statusItems: { type: Array, default: () => [] }
});

function normalizePercent(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

const normalizedDangerPercent = computed(() => normalizePercent(props.dangerPercent));
const normalizedPrimaryPercent = computed(() => normalizePercent(props.primaryPercent));
const primaryRingStyle = computed(() => ({
  background: `conic-gradient(#75edc4 0 ${normalizedPrimaryPercent.value}%, rgba(255,255,255,.18) ${normalizedPrimaryPercent.value}% 100%)`
}));
const ringStyle = computed(() => ({
  background: `conic-gradient(#ef4d5e 0 ${normalizedDangerPercent.value}%, #f5dfe1 ${normalizedDangerPercent.value}% 100%)`
}));
</script>

<style scoped>
.financial-overview { display:grid; gap:1rem; }
.financial-overview__top { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
.financial-overview__primary,.financial-overview__danger,.financial-overview__mini,.financial-overview__status { min-width:0; border:1px solid #dfe6e3; border-radius:.85rem; box-shadow:0 5px 16px rgb(15 23 42 / .055); }
.financial-overview__hero-card { position:relative; display:flex; min-height:13rem; align-items:center; justify-content:space-between; gap:1rem; padding:1.5rem; }
.financial-overview__primary { overflow:hidden; background:linear-gradient(135deg,#11816e,#00614e); color:#fff; }
.financial-overview__primary::before { content:""; position:absolute; inset:-50% auto auto -10%; width:22rem; height:22rem; border-radius:50%; background:#31c8a133; filter:blur(4px); }
.financial-overview__hero-copy { position:relative; z-index:2; display:block; min-width:0; flex:1 1 auto; padding-top:.25rem; }
.financial-overview__hero-copy>div { width:100%; min-width:0; }
.financial-overview__hero-copy>.financial-overview__icon { position:absolute; top:0; right:0; }
.financial-overview__hero-copy .financial-overview__eyebrow { display:flex; min-height:3.5rem; align-items:center; padding-right:4.35rem; }
.financial-overview__icon { display:grid; width:3.5rem; height:3.5rem; flex:0 0 3.5rem; place-items:center; border-radius:.75rem; }
.financial-overview__icon svg { width:1.7rem; height:1.7rem; }
.financial-overview__icon--glass { border:1px solid #ffffff2d; background:#ffffff14; color:#eafff8; }
.financial-overview__icon--danger { background:#ffd8db; color:#df3148; }
.financial-overview__eyebrow { font-size:.92rem; font-weight:850; color:#58677d; }
.financial-overview__primary .financial-overview__eyebrow { color:#e7fff6; }
.financial-overview__hero-value { margin-top:.8rem; font-size:clamp(.95rem,1.45vw,1.65rem); line-height:1.35; font-weight:950; letter-spacing:-.055em; white-space:nowrap; }
.financial-overview__hero-meta { min-height:1rem; margin-top:.55rem; font-size:.72rem; }
.financial-overview__primary-meta { color:#c7f3e5; }
.financial-overview__danger-meta { color:#8893a2; }
.financial-overview__danger { background:linear-gradient(145deg,#fff8f8,#fff0f1); border-color:#f7d8db; }
.financial-overview__danger-value { color:#df2340; }
.financial-overview__ring { display:grid; width:8rem; height:8rem; flex:0 0 8rem; place-items:center; border-radius:50%; transform:scaleX(-1); }
.financial-overview__ring>div { display:flex; width:6.1rem; height:6.1rem; flex-direction:column; align-items:center; justify-content:center; border-radius:50%; background:#fff8f8; transform:scaleX(-1); }
.financial-overview__ring strong { color:#24324a; font-size:1.55rem; font-weight:950; }
.financial-overview__ring span { margin-top:.2rem; color:#6f7b8e; font-size:.68rem; }
.financial-overview__ring--primary { position:relative; z-index:2; }
.financial-overview__ring--primary>div { background:#08705d; }
.financial-overview__ring--primary strong { color:#fff; }
.financial-overview__ring--primary span { color:#c9f5e6; }
.financial-overview__bottom { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)) minmax(19rem,1.65fr); gap:1rem; }
.financial-overview__mini { position:relative; display:block; min-height:9rem; padding:1.15rem; background:#fff; }
.financial-overview__mini>div { width:100%; min-width:0; }
.financial-overview__mini-icon { display:grid; width:3rem; height:3rem; flex:0 0 3rem; place-items:center; border-radius:.7rem; }
.financial-overview__mini>.financial-overview__mini-icon { position:absolute; top:1.15rem; right:1.15rem; }
.financial-overview__mini-icon svg { width:1.5rem; height:1.5rem; }
.financial-overview__mini-icon--blue { background:#e8f1ff; color:#1570d8; }
.financial-overview__mini-icon--violet { background:#f1e9ff; color:#7c3aed; }
.financial-overview__mini-icon--amber { background:#fff4dc; color:#d58a00; }
.financial-overview__mini-icon--emerald { background:#e1f7ef; color:#0b936e; }
.financial-overview__mini p { min-height:3rem; padding-right:3.85rem; color:#64748b; font-size:.78rem; font-weight:750; }
.financial-overview__mini strong { display:block; max-width:100%; margin-top:.45rem; color:#17243b; font-size:clamp(.95rem,1.15vw,1.35rem); font-weight:950; letter-spacing:-.045em; white-space:nowrap; }
.financial-overview__mini small { display:block; margin-top:.3rem; color:#94a3b8; font-size:.65rem; }
.financial-overview__mini .financial-overview__mini-value--violet { color:#7c3aed; }
.financial-overview__mini .financial-overview__mini-value--amber { color:#b76e00; }
.financial-overview__mini .financial-overview__mini-value--emerald { color:#078263; }
.financial-overview__status { display:flex; min-height:9rem; flex-direction:column; justify-content:center; padding:1.15rem; background:#fff; }
.financial-overview__status-title { display:flex; align-items:center; gap:.55rem; color:#334155; font-size:.82rem; }
.financial-overview__status-mark { display:grid; width:2rem; height:2rem; place-items:center; border-radius:.55rem; background:#e3f7ef; color:#0c936e; }
.financial-overview__status-mark svg { width:1.15rem; height:1.15rem; }
.financial-overview__status-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.8rem; margin-top:.8rem; }
.financial-overview__status-item+ .financial-overview__status-item { border-right:1px solid #e9edf1; padding-right:.8rem; }
.financial-overview__status-item>div:first-child { display:flex; align-items:center; justify-content:space-between; gap:.5rem; color:#7b8798; font-size:.68rem; }
.financial-overview__status-item strong { font-size:1.15rem; font-weight:950; }
.financial-overview__bar { height:.48rem; margin-top:.55rem; overflow:hidden; border-radius:99px; background:#edf1f4; }
.financial-overview__bar i { display:block; height:100%; border-radius:inherit; }
.is-success { color:#0c9a72; } .financial-overview__bar .is-success { background:#25bb91; }
.is-danger { color:#ef4d5e; } .financial-overview__bar .is-danger { background:#f36b76; }
.is-warning { color:#d68905; } .financial-overview__bar .is-warning { background:#e9a52d; }
.is-info { color:#3978dc; } .financial-overview__bar .is-info { background:#4a8be9; }
@media(max-width:1279px){.financial-overview__bottom{grid-template-columns:repeat(3,minmax(0,1fr))}.financial-overview__status{grid-column:1/-1}.financial-overview__top{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.financial-overview__top{grid-template-columns:1fr}.financial-overview__bottom{grid-template-columns:repeat(2,minmax(0,1fr))}.financial-overview__status{grid-column:1/-1}}
@media(max-width:560px){.financial-overview__bottom{grid-template-columns:1fr}.financial-overview__status{grid-column:auto}.financial-overview__danger{align-items:flex-start}.financial-overview__ring{width:6.6rem;height:6.6rem;flex-basis:6.6rem}.financial-overview__ring>div{width:5rem;height:5rem}.financial-overview__status-grid{grid-template-columns:1fr}.financial-overview__status-item+ .financial-overview__status-item{border-top:1px solid #e9edf1;border-right:0;padding-top:.7rem;padding-right:0}}
</style>
