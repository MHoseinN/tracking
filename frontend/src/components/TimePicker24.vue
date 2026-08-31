<template>
  <div ref="pickerRoot" class="time-picker-24">
    <button type="button" class="time-picker-24__trigger" :class="inputClass"
      :aria-expanded="show ? 'true' : 'false'" aria-haspopup="dialog" @click="togglePicker">
      <svg class="time-picker-24__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke-width="1.8" />
        <path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
      </svg>
      <span v-if="normalizedValue" class="time-picker-24__value">
        <b>{{ selectedHour }}</b><i>:</i><b>{{ selectedMinute }}</b>
      </span>
      <span v-else class="time-picker-24__placeholder">{{ placeholder }}</span>
      <svg class="time-picker-24__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m7 10 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="show" ref="pickerPanel" class="time-picker-24__panel" :style="panelStyle" dir="rtl">
        <div class="time-picker-24__panel-title">
          <div><strong>انتخاب ساعت</strong><span>نمایش ۲۴ ساعته</span></div>
          <button type="button" aria-label="بستن" @click="closePicker">×</button>
        </div>

        <div class="time-picker-24__columns" dir="ltr">
          <section>
            <span>ساعت</span>
            <div ref="hoursList" class="time-picker-24__list">
              <button v-for="hour in hours" :key="hour" type="button"
                :class="{ 'is-selected': hour === selectedHour }" @click="selectedHour = hour">
                {{ hour }}
              </button>
            </div>
          </section>
          <div class="time-picker-24__separator">:</div>
          <section>
            <span>دقیقه</span>
            <div ref="minutesList" class="time-picker-24__list">
              <button v-for="minute in minutes" :key="minute" type="button"
                :class="{ 'is-selected': minute === selectedMinute }" @click="selectedMinute = minute">
                {{ minute }}
              </button>
            </div>
          </section>
        </div>

        <div class="time-picker-24__quick-actions">
          <button type="button" @click="selectNow">اکنون</button>
          <button v-for="time in quickTimes" :key="time" type="button" @click="selectTime(time)">{{ time }}</button>
        </div>
        <div class="time-picker-24__footer">
          <button type="button" class="time-picker-24__cancel" @click="closePicker">انصراف</button>
          <button type="button" class="time-picker-24__confirm" @click="confirmSelection">تأیید ساعت</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  inputClass: { type: String, default: '' },
  placeholder: { type: String, default: 'انتخاب ساعت' }
});
const emit = defineEmits(['update:modelValue']);

const pickerRoot = ref(null);
const pickerPanel = ref(null);
const hoursList = ref(null);
const minutesList = ref(null);
const show = ref(false);
const selectedHour = ref('00');
const selectedMinute = ref('00');
const panelStyle = ref({ top: '0px', left: '0px', zIndex: 230 });
const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const quickTimes = ['08:00', '12:00', '18:00'];
const normalizedValue = computed(() => normalizeTime(props.modelValue));

watch(() => props.modelValue, syncFromModel, { immediate: true });
watch(show, async (open) => {
  if (!open) return removePositionListeners();
  syncFromModel(props.modelValue, true);
  addPositionListeners();
  await nextTick();
  updatePanelPosition();
  scrollToSelection();
});

onMounted(() => document.addEventListener('mousedown', handleOutsideClick));
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick);
  removePositionListeners();
});

function normalizeTime(value) {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? `${match[1]}:${match[2]}` : '';
}

function syncFromModel(value, useNowWhenEmpty = false) {
  const normalized = normalizeTime(value);
  if (normalized) [selectedHour.value, selectedMinute.value] = normalized.split(':');
  else if (useNowWhenEmpty) {
    const now = new Date();
    selectedHour.value = String(now.getHours()).padStart(2, '0');
    selectedMinute.value = String(now.getMinutes()).padStart(2, '0');
  }
}

function togglePicker() { show.value = !show.value; }
function closePicker() { show.value = false; }
function confirmSelection() {
  emit('update:modelValue', `${selectedHour.value}:${selectedMinute.value}`);
  closePicker();
}
function selectNow() {
  const now = new Date();
  selectedHour.value = String(now.getHours()).padStart(2, '0');
  selectedMinute.value = String(now.getMinutes()).padStart(2, '0');
  nextTick(scrollToSelection);
}
function selectTime(time) {
  [selectedHour.value, selectedMinute.value] = time.split(':');
  nextTick(scrollToSelection);
}
function scrollToSelection() {
  hoursList.value?.querySelector('.is-selected')?.scrollIntoView({ block: 'center' });
  minutesList.value?.querySelector('.is-selected')?.scrollIntoView({ block: 'center' });
}
function handleOutsideClick(event) {
  if (!show.value) return;
  if (!pickerRoot.value?.contains(event.target) && !pickerPanel.value?.contains(event.target)) closePicker();
}
function addPositionListeners() {
  window.addEventListener('resize', updatePanelPosition);
  window.addEventListener('scroll', updatePanelPosition, true);
}
function removePositionListeners() {
  window.removeEventListener('resize', updatePanelPosition);
  window.removeEventListener('scroll', updatePanelPosition, true);
}
function updatePanelPosition() {
  if (!show.value || !pickerRoot.value) return;
  const triggerRect = pickerRoot.value.getBoundingClientRect();
  const panelWidth = pickerPanel.value?.offsetWidth || 304;
  const panelHeight = pickerPanel.value?.offsetHeight || 390;
  const padding = 8;
  const gap = 6;
  const below = window.innerHeight - triggerRect.bottom - padding;
  const above = triggerRect.top - padding;
  let top = below >= panelHeight || below >= above ? triggerRect.bottom + gap : triggerRect.top - panelHeight - gap;
  top = Math.max(padding, Math.min(top, window.innerHeight - panelHeight - padding));
  let left = triggerRect.right - panelWidth;
  left = Math.max(padding, Math.min(left, window.innerWidth - panelWidth - padding));
  panelStyle.value = { top: `${Math.round(top)}px`, left: `${Math.round(left)}px`, zIndex: 230 };
}
</script>

<style scoped>
.time-picker-24 { position: relative; width: 100%; height: 100%; }
.time-picker-24__trigger {
  display: grid; width: 100%; min-height: 2.75rem; grid-template-columns: 1.25rem 1fr 1rem;
  align-items: center; gap: .5rem; border: 1px solid #d6d3d1; border-radius: .65rem;
  background: #fff; padding: 0 .75rem; color: #1f2937; transition: .18s ease;
}
.time-picker-24__trigger:hover { border-color: #86a99c; background: #fffefa; }
.time-picker-24__trigger:focus { border-color: #0f6b53; outline: 0; box-shadow: 0 0 0 3px rgba(15,107,83,.12); }
.time-picker-24__icon { width: 1.15rem; color: #0f6b53; }
.time-picker-24__chevron { width: .9rem; color: #64748b; }
.time-picker-24__value { direction: ltr; text-align: center; font-variant-numeric: tabular-nums; }
.time-picker-24__value b { font-size: .9rem; font-weight: 900; }
.time-picker-24__value i { margin: 0 .3rem; color: #0f6b53; font-style: normal; font-weight: 900; }
.time-picker-24__placeholder { color: #94a3b8; font-size: .78rem; text-align: center; }
.time-picker-24__panel {
  position: fixed; width: 19rem; overflow: hidden; border: 1px solid #d9d3c7; border-radius: .85rem;
  background: #fffdf8; box-shadow: 0 22px 55px rgba(22,51,43,.24);
}
.time-picker-24__panel-title { display: flex; align-items: center; justify-content: space-between; padding: .85rem 1rem; border-bottom: 1px solid #e8e1d5; }
.time-picker-24__panel-title strong { display: block; color: #173f34; font-size: .85rem; }
.time-picker-24__panel-title span { display: block; margin-top: .15rem; color: #789087; font-size: .62rem; }
.time-picker-24__panel-title button { width: 1.8rem; height: 1.8rem; border-radius: .45rem; color: #64748b; font-size: 1.2rem; }
.time-picker-24__panel-title button:hover { background: #f1eee7; }
.time-picker-24__columns { display: grid; grid-template-columns: 1fr 1.2rem 1fr; gap: .35rem; padding: .75rem 1rem; }
.time-picker-24__columns section > span { display: block; margin-bottom: .4rem; color: #64748b; font-size: .65rem; font-weight: 800; text-align: center; }
.time-picker-24__separator { display: grid; place-items: center; padding-top: 1.25rem; color: #0f6b53; font-size: 1.35rem; font-weight: 900; }
.time-picker-24__list { height: 11.5rem; overflow-y: auto; padding: .2rem; border: 1px solid #e5e0d6; border-radius: .6rem; background: #faf9f5; scrollbar-width: thin; }
.time-picker-24__list button { display: block; width: 100%; height: 2.25rem; border-radius: .45rem; color: #475569; font-size: .78rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.time-picker-24__list button:hover { background: #eaf5ef; color: #0f6b53; }
.time-picker-24__list button.is-selected { background: #0f6b53; color: #fff; box-shadow: 0 4px 10px rgba(15,107,83,.2); }
.time-picker-24__quick-actions { display: flex; gap: .4rem; padding: 0 1rem .75rem; direction: rtl; }
.time-picker-24__quick-actions button { flex: 1; border: 1px solid #d8d1c3; border-radius: .45rem; background: #fff; padding: .4rem .25rem; color: #51655e; font-size: .65rem; font-weight: 800; }
.time-picker-24__quick-actions button:hover { border-color: #8eb7a8; background: #edf6f0; color: #0f6b53; }
.time-picker-24__footer { display: flex; gap: .5rem; padding: .75rem 1rem; border-top: 1px solid #e8e1d5; background: #faf8f2; }
.time-picker-24__footer button { height: 2.35rem; border-radius: .55rem; font-size: .72rem; font-weight: 900; }
.time-picker-24__cancel { flex: .7; border: 1px solid #d8d1c3; background: #fff; color: #64748b; }
.time-picker-24__confirm { flex: 1.3; background: #0f6b53; color: #fff; }
.time-picker-24__confirm:hover { background: #0b493b; }
</style>
