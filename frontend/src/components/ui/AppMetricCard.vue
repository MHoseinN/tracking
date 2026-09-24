<template>
  <article class="app-metric-card">
    <div class="app-metric-card__header">
      <span class="app-metric-card__icon" :class="`app-metric-card__icon--${normalizedTone}`" aria-hidden="true">
        <slot name="icon">
          <svg v-if="icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="icon === 'crown'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.8">
            <path d="m3 6 4.5 5L12 4l4.5 7L21 6l-2 12H5L3 6Zm3 15h12" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
          <svg v-else-if="icon === 'box'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path
              d="m21 8-9 5-9-5m9 5v9M4.5 5.5 12 2l7.5 3.5A2.5 2.5 0 0 1 21 7.8v8.4a2.5 2.5 0 0 1-1.5 2.3L12 22l-7.5-3.5A2.5 2.5 0 0 1 3 16.2V7.8a2.5 2.5 0 0 1 1.5-2.3Z"
              stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke-linejoin="round" />
            <path d="M14 3v5h5M9 13h6M9 17h6" stroke-linecap="round" />
          </svg>
        </slot>
      </span>
      <p class="app-metric-card__label">{{ label }}</p>
    </div>

    <div class="app-metric-card__content text-center">
      <strong class="app-metric-card__value" :class="`app-metric-card__value--${normalizedTone}`">{{ value }}</strong>
      <!-- <small v-if="meta" class="app-metric-card__meta">{{ meta }}</small> -->
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  meta: { type: String, default: '' },
  tone: { type: String, default: 'blue' },
  icon: { type: String, default: 'invoice' }
});

const supportedTones = new Set(['blue', 'violet', 'amber', 'emerald']);
const normalizedTone = computed(() => (supportedTones.has(props.tone) ? props.tone : 'blue'));
</script>

<style scoped>
.app-metric-card {
  display: flex;
  min-width: 0;
  min-height: 9rem;
  flex-direction: column;
  padding: 1.15rem;
  border: 1px solid #dfe6e3;
  border-radius: .85rem;
  background: #fff;
  box-shadow: 0 5px 16px rgb(15 23 42 / .055);
}

.app-metric-card__header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: .85rem;
}

.app-metric-card__icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: 0 0 3rem;
  place-items: center;
  border-radius: .7rem;
}

.app-metric-card__icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.app-metric-card__icon--blue { background: #e8f1ff; color: #1570d8; }
.app-metric-card__icon--violet { background: #f1e9ff; color: #7c3aed; }
.app-metric-card__icon--amber { background: #fff4dc; color: #d58a00; }
.app-metric-card__icon--emerald { background: #e1f7ef; color: #0b936e; }

.app-metric-card__label {
  min-width: 0;
  flex: 1 1 auto;
  color: #64748b;
  font-size: .78rem;
  font-weight: 800;
  line-height: 1.7;
}

.app-metric-card__content {
  min-width: 0;
  margin-top: .85rem;
}

.app-metric-card__value {
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: #17243b;
  font-size: clamp(1.30rem, 1.35vw, 1.25rem);
  font-weight: 950;
  letter-spacing: -.045em;
  line-height: 1.55;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-metric-card__value--violet { color: #7c3aed; }
.app-metric-card__value--amber { color: #b76e00; }
.app-metric-card__value--emerald { color: #078263; }

.app-metric-card__meta {
  display: block;
  margin-top: .25rem;
  overflow: hidden;
  color: #94a3b8;
  font-size: .65rem;
  line-height: 1.7;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
