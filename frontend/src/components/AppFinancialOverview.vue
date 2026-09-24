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
          </div>
        </div>
        <div class="financial-overview__ring financial-overview__ring--primary" :style="primaryRingStyle">
          <div>
            <strong>{{ displayedPrimaryPercent }}٪</strong>
            <span>{{ primaryPercentLabel }}</span>
          </div>
        </div>
      </article>

      <article class="financial-overview__hero-card financial-overview__danger">
        <div class="financial-overview__hero-copy">
          <span class="financial-overview__icon financial-overview__icon--danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path
                d="M4 7.5h14A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H5.5A2.5 2.5 0 0 1 3 17V6a2.5 2.5 0 0 1 2.5-2.5H17"
                stroke-linecap="round" stroke-linejoin="round" />
              <path d="M15 12h6v4h-6a2 2 0 0 1 0-4Z" />
            </svg>
          </span>
          <div>
            <p class="financial-overview__eyebrow">{{ dangerLabel }}</p>
            <p class="financial-overview__hero-value financial-overview__danger-value">{{ dangerValue }}</p>
          </div>
        </div>
        <div class="financial-overview__ring" :style="ringStyle">
          <div>
            <strong>{{ displayedDangerPercent }}٪</strong>
            <span>{{ dangerPercentLabel }}</span>
          </div>
        </div>
      </article>
    </div>

    <div class="financial-overview__bottom">
      <AppMetricCard v-for="(item, index) in items" :key="`${item.label}-${index}`" v-bind="item" />

      <article v-if="statusItems.length" class="financial-overview__status">
        <div class="financial-overview__status-title">
          <span class="financial-overview__status-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" stroke-linecap="round" />
            </svg>
          </span>
          <strong>{{ statusTitle }}</strong>
        </div>
        <div class="financial-overview__status-grid">
          <div v-for="status in statusItems" :key="status.label" class="financial-overview__status-item">
            <div>
              <span>{{ status.label }}</span>
              <strong  :class="`is-${status.tone || 'success'}`">{{ status.value }}</strong>
            </div>
            <div class="financial-overview__bar"><i :class="`is-${status.tone || 'success'}`"
                :style="{ width: `${normalizePercent(status.percent)}%` }" /></div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import AppMetricCard from './ui/AppMetricCard.vue';

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
const animatedPrimaryPercent = ref(0);
const animatedDangerPercent = ref(0);
const displayedPrimaryPercent = computed(() => Math.round(animatedPrimaryPercent.value));
const displayedDangerPercent = computed(() => Math.round(animatedDangerPercent.value));
let animationFrame = null;

function animateRings(primaryTarget, dangerTarget) {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animatedPrimaryPercent.value = primaryTarget;
    animatedDangerPercent.value = dangerTarget;
    animationFrame = null;
    return;
  }

  animatedPrimaryPercent.value = 0;
  animatedDangerPercent.value = 0;
  const duration = 850;
  const startedAt = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const easedProgress = 1 - ((1 - progress) ** 3);
    animatedPrimaryPercent.value = primaryTarget * easedProgress;
    animatedDangerPercent.value = dangerTarget * easedProgress;
    if (progress < 1) animationFrame = requestAnimationFrame(step);
    else animationFrame = null;
  };
  animationFrame = requestAnimationFrame(step);
}

watch(
  [normalizedPrimaryPercent, normalizedDangerPercent],
  ([primaryTarget, dangerTarget]) => animateRings(primaryTarget, dangerTarget),
  { immediate: true }
);

onBeforeUnmount(() => {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
});

const primaryRingStyle = computed(() => ({
  background: `conic-gradient(#75edc4 0 ${animatedPrimaryPercent.value}%, rgba(255,255,255,.18) ${animatedPrimaryPercent.value}% 100%)`
}));
const ringStyle = computed(() => ({
  background: `conic-gradient(#ef4d5e 0 ${animatedDangerPercent.value}%, #f5dfe1 ${animatedDangerPercent.value}% 100%)`
}));
</script>

<style scoped>
.financial-overview {
  display: grid;
  gap: 1rem;
}

.financial-overview__top {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.financial-overview__primary,
.financial-overview__danger,
.financial-overview__status {
  min-width: 0;
  border: 1px solid #dfe6e3;
  border-radius: .85rem;
  box-shadow: 0 5px 16px rgb(15 23 42 / .055);
}

.financial-overview__hero-card {
  position: relative;
  display: flex;
  min-height: 13rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
}

.financial-overview__primary {
  overflow: hidden;
  background: linear-gradient(135deg, #11816e, #00614e);
  color: #fff;
}

.financial-overview__primary::before {
  content: "";
  position: absolute;
  inset: -50% auto auto -10%;
  width: 22rem;
  height: 22rem;
  border-radius: 50%;
  background: #31c8a133;
  filter: blur(4px);
}

.financial-overview__hero-copy {
  position: relative;
  z-index: 2;
  display: block;
  min-width: 0;
  flex: 1 1 auto;
  padding-top: .25rem;
}

.financial-overview__hero-copy>div {
  width: 100%;
  min-width: 0;
}

.financial-overview__hero-copy>.financial-overview__icon {
  position: absolute;
  top: 0;
  right: 0;
}

.financial-overview__hero-copy .financial-overview__eyebrow {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  padding-right: 4.35rem;
}

.financial-overview__icon {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  flex: 0 0 3.5rem;
  place-items: center;
  border-radius: .75rem;
}

.financial-overview__icon svg {
  width: 1.7rem;
  height: 1.7rem;
}

.financial-overview__icon--glass {
  border: 1px solid #ffffff2d;
  background: #ffffff14;
  color: #eafff8;
}

.financial-overview__icon--danger {
  background: #ffd8db;
  color: #df3148;
}

.financial-overview__eyebrow {
  font-size: .92rem;
  font-weight: 850;
  color: #58677d;
}

.financial-overview__primary .financial-overview__eyebrow {
  color: #e7fff6;
}

.financial-overview__hero-value {
  margin-top: .8rem;
  font-size: clamp(1.65rem, 1.65vw, 1.65rem);
  line-height: 1.35;
  font-weight: 950;
  letter-spacing: -.055em;
  white-space: nowrap;
}

.financial-overview__hero-meta {
  min-height: 1rem;
  margin-top: .55rem;
  font-size: .72rem;
}

.financial-overview__primary-meta {
  color: #c7f3e5;
}

.financial-overview__danger-meta {
  color: #8893a2;
}

.financial-overview__danger {
  background: linear-gradient(145deg, #fff8f8, #fff0f1);
  border-color: #f7d8db;
}

.financial-overview__danger-value {
  color: #df2340;
}

.financial-overview__ring {
  display: grid;
  width: 8rem;
  height: 8rem;
  flex: 0 0 8rem;
  place-items: center;
  border-radius: 50%;
  transform: scaleX(-1);
}

.financial-overview__ring>div {
  display: flex;
  width: 6.1rem;
  height: 6.1rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff8f8;
  transform: scaleX(-1);
}

.financial-overview__ring strong {
  color: #24324a;
  font-size: 1.55rem;
  font-weight: 950;
}

.financial-overview__ring span {
  margin-top: .2rem;
  color: #6f7b8e;
  font-size: .68rem;
}

.financial-overview__ring--primary {
  position: relative;
  z-index: 2;
}

.financial-overview__ring--primary>div {
  background: #08705d;
}

.financial-overview__ring--primary strong {
  color: #fff;
}

.financial-overview__ring--primary span {
  color: #c9f5e6;
}

.financial-overview__bottom {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(19rem, 1.65fr);
  gap: 1rem;
}

.financial-overview__status {
  display: flex;
  min-height: 9rem;
  flex-direction: column;
  justify-content: center;
  padding: 1.15rem;
  background: #fff;
}

.financial-overview__status-title {
  display: flex;
  align-items: center;
  gap: .55rem;
  color: #334155;
  font-size: .82rem;
}

.financial-overview__status-mark {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: .55rem;
  background: #e3f7ef;
  color: #0c936e;
}

.financial-overview__status-mark svg {
  width: 1.15rem;
  height: 1.15rem;
}

.financial-overview__status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .8rem;
  margin-top: .8rem;
}

.financial-overview__status-item+.financial-overview__status-item {
  border-right: 1px solid #e9edf1;
  padding-right: .8rem;
}

.financial-overview__status-item>div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  color: #7b8798;
  font-size: .68rem;
}

.financial-overview__status-item strong {
  font-size: 1.15rem;
  font-weight: 950;
}

.financial-overview__bar {
  height: .48rem;
  margin-top: .55rem;
  overflow: hidden;
  border-radius: 99px;
  background: #edf1f4;
}

.financial-overview__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.is-success {
  color: #0c9a72;
}

.financial-overview__bar .is-success {
  background: #25bb91;
}

.is-danger {
  color: #ef4d5e;
}

.financial-overview__bar .is-danger {
  background: #f36b76;
}

.is-warning {
  color: #d68905;
}

.financial-overview__bar .is-warning {
  background: #e9a52d;
}

.is-info {
  color: #3978dc;
}

.financial-overview__bar .is-info {
  background: #4a8be9;
}

@media(max-width:1279px) {
  .financial-overview__bottom {
    grid-template-columns: repeat(3, minmax(0, 1fr))
  }

  .financial-overview__status {
    grid-column: 1/-1
  }

  .financial-overview__top {
    grid-template-columns: repeat(2, minmax(0, 1fr))
  }
}

@media(max-width:900px) {
  .financial-overview__top {
    grid-template-columns: 1fr
  }

  .financial-overview__bottom {
    grid-template-columns: repeat(2, minmax(0, 1fr))
  }

  .financial-overview__status {
    grid-column: 1/-1
  }
}

@media(max-width:560px) {
  .financial-overview__bottom {
    grid-template-columns: 1fr
  }

  .financial-overview__status {
    grid-column: auto
  }

  .financial-overview__danger {
    align-items: flex-start
  }

  .financial-overview__ring {
    width: 6.6rem;
    height: 6.6rem;
    flex-basis: 6.6rem
  }

  .financial-overview__ring>div {
    width: 5rem;
    height: 5rem
  }

  .financial-overview__status-grid {
    grid-template-columns: 1fr
  }

  .financial-overview__status-item+.financial-overview__status-item {
    border-top: 1px solid #e9edf1;
    border-right: 0;
    padding-top: .7rem;
    padding-right: 0
  }
}
</style>
