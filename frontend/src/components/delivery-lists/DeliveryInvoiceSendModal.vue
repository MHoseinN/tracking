<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/55 p-4"
      @click.self="emit('close')">
      <div class="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-slate-300 px-6 py-4">
          <div>
            <h3 class="text-lg font-black text-slate-900">مدیریت ارسال فاکتور</h3>
            <p class="mt-1 text-xs text-slate-500">فاکتور شماره {{ invoice?.invoice_number || '—' }}</p>
          </div>
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-500"
            :disabled="saving" @click="emit('close')">بستن</button>
        </header>

        <div class="overflow-y-auto p-6">
          <div class="mb-5 flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
            <span class="text-sm font-bold text-slate-700">وضعیت فعلی:</span>
            <span class="app-badge" :class="invoice?.send_status === 'SENT' ? 'bg-cyan-100 text-cyan-700' : 'bg-rose-100 text-rose-700'">
              {{ invoice?.send_status === 'SENT' ? 'ارسال‌شده' : 'ارسال‌نشده' }}
            </span>
          </div>

          <form class="mb-6" @submit.prevent="submit">
            <table class="w-full border-collapse border border-slate-300">
              <tbody>
                <tr>
                  <th class="w-40 border border-slate-300 bg-slate-100 px-4 py-3 text-right text-xs">روش ارسال</th>
                  <td class="border border-slate-300 p-2">
                    <select v-model="form.channel" class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500">
                      <option value="EITA">ایتا</option>
                      <option value="PRINT">نسخه چاپی</option>
                      <option value="MANUAL">ارسال دستی</option>
                      <option value="OTHER">سایر</option>
                    </select>
                  </td>
                  <th class="w-40 border border-slate-300 bg-slate-100 px-4 py-3 text-right text-xs">زمان ارسال</th>
                  <td class="border border-slate-300 p-2">
                    <input v-model="form.sent_at" type="datetime-local" required
                      class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500" />
                  </td>
                </tr>
                <tr>
                  <th class="border border-slate-300 bg-slate-100 px-4 py-3 text-right text-xs">گیرنده / شناسه</th>
                  <td class="border border-slate-300 p-2">
                    <input v-model.trim="form.recipient" type="text" maxlength="255" placeholder="اختیاری"
                      class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500" />
                  </td>
                  <th class="border border-slate-300 bg-slate-100 px-4 py-3 text-right text-xs">یادداشت</th>
                  <td class="border border-slate-300 p-2">
                    <input v-model.trim="form.notes" type="text" maxlength="2000" placeholder="اختیاری"
                      class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500" />
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="mt-4 flex flex-wrap gap-3">
              <button type="submit" class="app-button-primary bg-cyan-600 hover:bg-cyan-700" :disabled="saving">
                {{ saving ? 'در حال ثبت...' : (invoice?.send_status === 'SENT' ? 'ثبت ارسال مجدد' : 'ثبت ارسال فاکتور') }}
              </button>
              <button v-if="invoice?.send_status === 'SENT'" type="button"
                class="app-button-secondary border-rose-200 bg-rose-50 text-rose-700" :disabled="saving"
                @click="emit('request-unsent')">برگرداندن به ارسال‌نشده</button>
            </div>
          </form>

          <section>
            <h4 class="mb-3 text-sm font-black text-slate-800">تاریخچه ارسال</h4>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[850px] border-collapse border border-slate-300">
                <thead class="bg-slate-100">
                  <tr>
                    <th v-for="heading in ['وضعیت','زمان','روش','گیرنده','ثبت‌کننده','یادداشت']" :key="heading"
                      class="border border-slate-300 px-3 py-3 text-right text-xs text-slate-600">{{ heading }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!invoice?.send_logs?.length">
                    <td colspan="6" class="border border-slate-300 px-3 py-6 text-center text-sm text-slate-400">هنوز سابقه ارسالی ثبت نشده است.</td>
                  </tr>
                  <tr v-for="log in invoice?.send_logs || []" :key="log.id">
                    <td class="border border-slate-300 px-3 py-3">
                      <span class="app-badge" :class="log.status === 'SENT' ? 'bg-cyan-100 text-cyan-700' : 'bg-rose-100 text-rose-700'">
                        {{ log.status === 'SENT' ? 'ارسال' : 'لغو / ناموفق' }}
                      </span>
                    </td>
                    <td class="border border-slate-300 px-3 py-3 text-sm">{{ formatDateTime(log.sent_at) }}</td>
                    <td class="border border-slate-300 px-3 py-3 text-sm">{{ channelLabel(log.channel) }}</td>
                    <td class="border border-slate-300 px-3 py-3 text-sm">{{ log.recipient || '—' }}</td>
                    <td class="border border-slate-300 px-3 py-3 text-sm">{{ log.sent_by_name || '—' }}</td>
                    <td class="border border-slate-300 px-3 py-3 text-sm">{{ log.notes || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { toPersianDate } from '../../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  invoice: { type: Object, default: null },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'save', 'request-unsent']);
const form = reactive({ channel: 'EITA', sent_at: '', recipient: '', notes: '' });

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) return;
  form.channel = 'EITA';
  form.sent_at = localDateTimeValue(new Date());
  form.recipient = '';
  form.notes = '';
}, { immediate: true });

function localDateTimeValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function submit() {
  emit('save', {
    send_status: 'SENT',
    channel: form.channel,
    sent_at: new Date(form.sent_at).toISOString(),
    recipient: form.recipient || null,
    notes: form.notes || null
  });
}

function channelLabel(channel) {
  return ({ EITA: 'ایتا', PRINT: 'نسخه چاپی', MANUAL: 'ارسال دستی', OTHER: 'سایر' })[channel] || channel;
}

function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  return `${toPersianDate(text.slice(0, 10))} - ${text.slice(11, 16)}`;
}
</script>
