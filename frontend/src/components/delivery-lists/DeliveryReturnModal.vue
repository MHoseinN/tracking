<template>
  <Teleport to="body">
    <div v-if="isOpen" class="return-overlay" @click.self="emit('close')">
      <div class="return-workspace" dir="rtl">
        <header class="return-header">
          <div class="flex flex-wrap items-center gap-2">
            <h2>ثبت مرجوعی لیست</h2>
            <span class="status-badge">در جریان</span>
            <span class="list-badge">شماره لیست {{ list?.list_number || '—' }}</span>
          </div>
          <button type="button" class="close-button" :disabled="saving" @click="emit('close')">✕</button>
        </header>

        <form class="min-h-0 flex flex-1 flex-col" @submit.prevent="submitReturn">
          <div class="return-scroll">
            <section class="information-grid">
              <div class="field customer-field"><span class="field-label">مشتری</span><strong>{{ list?.customer_name || 'نامشخص' }}</strong></div>
              <div class="field readonly-field"><span class="field-label">تاریخ تحویل</span><strong dir="ltr">{{ deliveryDate }}</strong></div>
              <div class="field readonly-field"><span class="field-label">ساعت تحویل</span><strong dir="ltr">{{ deliveryTime }}</strong></div>
              <label class="field"><span class="field-label">تاریخ برگشت این نوبت</span><JalaliDatePicker v-model="returnedDate" input-class="field-control" /></label>
              <label class="field"><span class="field-label">ساعت برگشت</span><TimePicker24 v-model="returnedTime" input-class="field-control" /></label>

              <div class="rule-field" :class="{ active: list?.night_before }">
                <span class="rule-switch"><i></i></span><span><strong>شب قبل</strong><small>{{ list?.night_before ? 'فعال در محاسبه' : 'غیرفعال' }}</small></span>
              </div>
              <div class="field readonly-field"><span class="field-label">ساعت مرزی</span><strong dir="ltr">{{ cutoffTime }}</strong></div>
              <div class="field days-field"><span class="field-label">روز محاسبه‌شده</span><strong>{{ formatNumber(systemDays) }} روز</strong></div>
              <label class="field notes-field"><span class="field-label">توضیحات این نوبت</span><input v-model.trim="notes" class="field-control" maxlength="5000" placeholder="یادداشت اختیاری برای این مرجوعی" /></label>
            </section>

            <section class="items-section">
              <div class="items-toolbar">
                <div><h3>مدیریت اقلام لیست</h3><p>تحویل، برگشت قبلی، مرجوعی این نوبت و مانده هر محصول را یکجا مدیریت کنید.</p></div>
                <span class="items-count">{{ formatNumber(selectedItemCount) }} قلم انتخاب‌شده</span>
              </div>

              <div class="table-wrap">
                <table class="return-table">
                  <thead><tr>
                    <th>محصول</th><th>تحویل</th><th>برگشت قبلی</th><th>سالم این نوبت</th><th>خسارت</th><th>مفقودی</th><th>مانده بعد</th><th>روز</th><th>قیمت روزانه</th><th>مبلغ برآوردی</th><th>جزئیات</th>
                  </tr></thead>
                  <tbody>
                    <template v-for="row in rows" :key="row.delivery_list_item_id">
                      <tr :class="{ selected: totalReturned(row) > 0 }">
                        <td class="product-cell"><strong>{{ row.product_name_snapshot }}</strong><small>مانده فعلی: {{ formatNumber(row.remaining_quantity) }}</small></td>
                        <td class="static-number">{{ formatNumber(row.delivered_quantity) }}</td>
                        <td class="static-number text-sky-700">{{ formatNumber(row.previously_returned_quantity) }}</td>
                        <td><NumberStepper v-model="row.healthy_quantity" :max="row.remaining_quantity" /></td>
                        <td><NumberStepper v-model="row.damaged_quantity" :max="row.remaining_quantity" /></td>
                        <td><NumberStepper v-model="row.lost_quantity" :max="row.remaining_quantity" /></td>
                        <td class="remaining" :class="remainingAfter(row) ? 'text-amber-700' : 'text-emerald-700'">{{ formatNumber(remainingAfter(row)) }}</td>
                        <td><input v-model.number="row.final_charged_days" class="days-input" type="number" min="1" /></td>
                        <td class="money">{{ formatCurrency(row.daily_price_toman) }}</td>
                        <td class="money total-money">{{ formatCurrency(rowEstimatedAmount(row)) }}</td>
                        <td><button type="button" class="detail-button" :class="{ active: row.detailsOpen || rowNeedsDetails(row) }" @click="row.detailsOpen = !row.detailsOpen">{{ rowNeedsDetails(row) ? 'تکمیل' : 'توضیحات' }}</button></td>
                      </tr>
                      <tr v-if="row.detailsOpen || rowNeedsDetails(row)" class="detail-row"><td colspan="11"><div class="detail-fields">
                        <label><span>دلیل تغییر تعداد روز</span><input v-model.trim="row.day_override_reason" maxlength="1000" :disabled="Number(row.final_charged_days) === systemDays" placeholder="در صورت تغییر روز وارد کنید" /></label>
                        <label><span>شرح خسارت یا مفقودی</span><input v-model.trim="row.damage_notes" maxlength="2000" :disabled="!hasIssue(row)" placeholder="در صورت خسارت یا مفقودی توضیح دهید" /></label>
                      </div></td></tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </section>
            <p v-if="errorMessage" class="return-error">{{ errorMessage }}</p>
          </div>

          <footer class="return-footer">
            <div class="summary"><div><span>اقلام مرجوعی</span><strong>{{ formatNumber(selectedItemCount) }}</strong></div><div><span>تعداد این نوبت</span><strong>{{ formatNumber(selectedQuantity) }}</strong></div><div><span>مانده پس از ثبت</span><strong>{{ formatNumber(totalRemainingAfter) }}</strong></div><div><span>مبلغ برآوردی</span><strong>{{ formatCurrency(estimatedAmount) }}</strong></div></div>
            <div class="footer-actions"><button type="button" class="cancel" :disabled="saving" @click="emit('close')">انصراف</button><button type="submit" class="submit" :disabled="saving">{{ saving ? 'در حال ثبت...' : 'ثبت مرجوعی' }}</button></div>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, defineComponent, h, ref, watch } from 'vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import TimePicker24 from '../TimePicker24.vue';
import { calculateBillingDays } from '../../utils/billingDays';
import { getCurrentPersianDate, toGregorianDate, toPersianDate } from '../../utils/dateConverter';

const NumberStepper = defineComponent({
  props: { modelValue: { type: Number, default: 0 }, max: { type: Number, default: 0 } },
  emits: ['update:modelValue'],
  setup(p, { emit: e }) {
    const set = (v) => e('update:modelValue', Math.min(p.max, Math.max(0, Number(v) || 0)));
    return () => h('div', { class: 'number-stepper', dir: 'ltr' }, [
      h('button', { type: 'button', onClick: () => set(p.modelValue - 1) }, '−'),
      h('input', { value: p.modelValue, type: 'number', min: 0, max: p.max, onInput: (event) => set(event.target.value) }),
      h('button', { type: 'button', onClick: () => set(p.modelValue + 1) }, '+')
    ]);
  }
});

const props = defineProps({ isOpen: { type: Boolean, default: false }, list: { type: Object, default: null }, saving: { type: Boolean, default: false } });
const emit = defineEmits(['close', 'save']);
const returnedDate = ref(''); const returnedTime = ref(''); const notes = ref(''); const rows = ref([]); const errorMessage = ref('');
const returnedAt = computed(() => combineDateTime(returnedDate.value, returnedTime.value));
const systemDays = computed(() => calculateBillingDays({ deliveredAt: props.list?.delivered_at, returnedAt: returnedAt.value, cutoffMinutes: props.list?.billing_cutoff_minutes_snapshot, nightBefore: props.list?.night_before }));
const deliveryDate = computed(() => props.list?.delivered_at ? toPersianDate(String(props.list.delivered_at).slice(0, 10)) : '—');
const deliveryTime = computed(() => props.list?.delivered_at ? String(props.list.delivered_at).slice(11, 16) : '—');
const cutoffTime = computed(() => { const m = Number(props.list?.billing_cutoff_minutes_snapshot) || 0; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; });
const selectedRows = computed(() => rows.value.filter((r) => totalReturned(r) > 0));
const selectedItemCount = computed(() => selectedRows.value.length);
const selectedQuantity = computed(() => selectedRows.value.reduce((s, r) => s + totalReturned(r), 0));
const totalRemainingAfter = computed(() => rows.value.reduce((s, r) => s + remainingAfter(r), 0));
const estimatedAmount = computed(() => selectedRows.value.reduce((s, r) => s + rowEstimatedAmount(r), 0));

watch(() => props.isOpen, (open) => { if (open) resetForm(); });
watch(systemDays, (days, previous) => rows.value.forEach((r) => { if (!r.final_charged_days || Number(r.final_charged_days) === Number(previous)) r.final_charged_days = days; }));

function resetForm() {
  const now = new Date(); const today = getCurrentPersianDate();
  returnedDate.value = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;
  returnedTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; notes.value = ''; errorMessage.value = '';
  rows.value = (props.list?.items || []).filter((i) => Number(i.remaining_quantity) > 0).map((i) => ({ delivery_list_item_id:i.id, product_name_snapshot:i.product_name_snapshot, delivered_quantity:Number(i.delivered_quantity), previously_returned_quantity:Number(i.delivered_quantity)-Number(i.remaining_quantity), remaining_quantity:Number(i.remaining_quantity), daily_price_toman:Number(i.daily_price_toman), healthy_quantity:0, damaged_quantity:0, lost_quantity:0, final_charged_days:systemDays.value, day_override_reason:'', damage_notes:'', detailsOpen:false }));
}
function submitReturn() {
  errorMessage.value = '';
  if (!returnedDate.value || !returnedTime.value) return setError('تاریخ و ساعت برگشت الزامی است');
  if (Date.parse(returnedAt.value) < Date.parse(props.list?.delivered_at)) return setError('زمان برگشت نمی‌تواند قبل از زمان تحویل باشد');
  if (!selectedRows.value.length) return setError('حداقل تعداد برگشتی یک قلم را وارد کنید');
  for (const r of selectedRows.value) { if (totalReturned(r)>r.remaining_quantity) return setError(`تعداد «${r.product_name_snapshot}» از مانده بیشتر است`); if (hasIssue(r)&&!r.damage_notes) return setError(`شرح خسارت یا مفقودی «${r.product_name_snapshot}» را وارد کنید`); if (Number(r.final_charged_days)!==systemDays.value&&!r.day_override_reason) return setError(`دلیل تغییر تعداد روز «${r.product_name_snapshot}» را وارد کنید`); }
  emit('save', { returned_at:returnedAt.value, notes:notes.value||null, items:selectedRows.value.map((r)=>({ delivery_list_item_id:r.delivery_list_item_id, healthy_quantity:Number(r.healthy_quantity)||0, damaged_quantity:Number(r.damaged_quantity)||0, lost_quantity:Number(r.lost_quantity)||0, final_charged_days:Math.max(1,Math.round(Number(r.final_charged_days)||systemDays.value)), day_override_reason:r.day_override_reason||null, damage_notes:r.damage_notes||null })) });
}
function totalReturned(r){return (Number(r.healthy_quantity)||0)+(Number(r.damaged_quantity)||0)+(Number(r.lost_quantity)||0)}
function remainingAfter(r){return Math.max(0,Number(r.remaining_quantity)-totalReturned(r))} function hasIssue(r){return Number(r.damaged_quantity)>0||Number(r.lost_quantity)>0} function rowNeedsDetails(r){return hasIssue(r)||Number(r.final_charged_days)!==systemDays.value} function rowEstimatedAmount(r){return totalReturned(r)*Math.max(1,Number(r.final_charged_days)||1)*Number(r.daily_price_toman||0)}
function setError(m){errorMessage.value=m} function combineDateTime(d,t){return d&&t?`${toGregorianDate(d)}T${t}:00+03:30`:null} function formatNumber(v){return Number(v||0).toLocaleString('fa-IR')} function formatCurrency(v){return `${formatNumber(v)} تومان`}
</script>

<style scoped>
.return-overlay{position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;padding:1rem;background:#0f172a8f}.return-workspace{--g:#0f5f4c;--sage:#edf6f0;--cream:#fffdf8;display:flex;width:min(96vw,1500px);max-height:95vh;flex-direction:column;overflow:hidden;border:1px solid #e4dccd;border-radius:.85rem;background:var(--cream);box-shadow:0 26px 70px #0f172a4d}.return-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid #ebe4d7}.return-header h2{font-size:1.2rem;font-weight:950}.status-badge,.list-badge{border-radius:999px;padding:.35rem .7rem;font-size:.68rem;font-weight:900}.status-badge{background:#dbeafe;color:#1d4ed8}.list-badge{border:1px solid #b8ddce;background:#eaf7f0;color:#0f6b53}.close-button{width:2.45rem;height:2.45rem;border:1px solid #ddd6c9;border-radius:.6rem;background:#fff;color:#64748b}.return-scroll{min-height:0;flex:1;overflow-y:auto}.information-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:.85rem;padding:1.25rem;border-bottom:1px solid #ebe4d7}.field{position:relative;grid-column:span 2;height:3.25rem;border:1px solid #ded7c8;border-radius:.7rem;background:#fff}.customer-field{display:flex;grid-column:span 3;align-items:center;padding:0 .9rem}.readonly-field,.days-field{display:flex;align-items:center;justify-content:center}.days-field{border-color:#9ac7b7;background:var(--sage);color:var(--g)}.notes-field{grid-column:span 5}.field-label{position:absolute;z-index:2;top:-.55rem;right:.75rem;padding-inline:.35rem;background:var(--cream);color:#475569;font-size:.68rem;font-weight:900}.field-control,.field :deep(.field-control){width:100%;height:100%;border:0!important;background:transparent;padding:0 .9rem;font-size:.8rem;outline:none;box-shadow:none!important;text-align:center}.notes-field>.field-control{text-align:right}.field:focus-within{border-color:#4c8c79;box-shadow:0 0 0 3px #0f5f4c14}.rule-field{grid-column:span 3;display:flex;height:3.25rem;align-items:center;gap:.65rem;padding:.45rem .75rem;border:1px solid #ded7c8;border-radius:.7rem;background:#faf8f2}.rule-field.active{border-color:#86b7a8;background:var(--sage)}.rule-switch{display:flex;width:2rem;height:1.1rem;align-items:center;padding:.15rem;border-radius:999px;background:#cbd5e1}.rule-switch i{width:.8rem;height:.8rem;border-radius:50%;background:#fff}.rule-field.active .rule-switch{background:var(--g)}.rule-field.active .rule-switch i{transform:translateX(-.9rem)}.rule-field strong{display:block;font-size:.72rem}.rule-field small{display:block;color:#64748b;font-size:.6rem}.items-section{padding:1rem 1.25rem 1.25rem}.items-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem}.items-toolbar h3{font-weight:950}.items-toolbar p{margin-top:.25rem;color:#64748b;font-size:.7rem}.items-count{border:1px solid #cde2d8;border-radius:999px;background:var(--sage);padding:.4rem .75rem;color:var(--g);font-size:.72rem;font-weight:900}.table-wrap{overflow-x:auto;border-radius:.7rem}.return-table{width:100%;min-width:1350px;table-layout:fixed;border-collapse:separate;border-spacing:0}.return-table th,.return-table td{height:3.4rem;padding:.4rem;border-left:1px solid #e7e1d6;border-bottom:1px solid #e7e1d6;text-align:center}.return-table th:first-child,.return-table td:first-child{border-right:1px solid #e7e1d6}.return-table th{height:2.7rem;border-top:1px solid #e7e1d6;background:#f3f7f3;color:#365247;font-size:.66rem;font-weight:900}.return-table th:first-child{width:17%}.return-table tr.selected td{background:#fbfefc}.product-cell{text-align:right!important}.product-cell strong{display:block;font-size:.76rem}.product-cell small{display:block;margin-top:.2rem;color:#94a3b8;font-size:.58rem}.static-number,.remaining{font-size:.8rem;font-weight:900}.number-stepper{display:grid;height:2.2rem;grid-template-columns:1.7rem 1fr 1.7rem;overflow:hidden;border:1px solid #ded8cc;border-radius:.5rem;background:#fff}.number-stepper button{color:var(--g);font-weight:900}.number-stepper input{min-width:0;border-inline:1px solid #ebe5da;text-align:center;font-size:.72rem}.days-input{width:100%;height:2.2rem;border:1px solid #ded8cc;border-radius:.5rem;text-align:center}.money{font-size:.68rem;font-weight:800;white-space:nowrap}.total-money{color:var(--g);font-weight:950}.detail-button{border:1px solid #d7d0c3;border-radius:.45rem;padding:.38rem;color:#64748b;font-size:.62rem;font-weight:900}.detail-button.active{border-color:#e9b8b8;background:#fff1f2;color:#be123c}.detail-row td{height:auto;padding:.65rem;background:#faf8f2}.detail-fields{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.detail-fields label{text-align:right}.detail-fields span{display:block;margin-bottom:.3rem;color:#64748b;font-size:.62rem}.detail-fields input{width:100%;height:2.4rem;border:1px solid #ddd6c9;border-radius:.5rem;padding:0 .7rem;font-size:.7rem}.detail-fields input:disabled{background:#f1eee7}.return-error{margin:0 1.25rem 1rem;border:1px solid #fecdd3;border-radius:.6rem;background:#fff1f2;padding:.75rem;color:#be123c;font-size:.72rem}.return-footer{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-top:1px solid #e5ded2;background:#faf8f2;padding:.8rem 1.25rem}.summary{display:grid;flex:1;grid-template-columns:repeat(4,1fr)}.summary div{padding:.15rem 1rem;border-left:1px solid #ded7ca}.summary span{display:block;color:#64748b;font-size:.6rem}.summary strong{display:block;margin-top:.25rem;font-size:.82rem}.footer-actions{display:flex;gap:.6rem}.footer-actions button{height:2.7rem;border-radius:.58rem;padding:0 1.25rem;font-size:.76rem;font-weight:950}.cancel{border:1px solid #d8d1c3;background:#fff}.submit{background:var(--g);color:#fff}@media(max-width:1100px){.field,.customer-field,.rule-field{grid-column:span 4}.notes-field{grid-column:span 8}.return-footer{flex-direction:column;align-items:stretch}.footer-actions{align-self:flex-end}}@media(max-width:700px){.return-overlay{padding:.35rem}.field,.customer-field,.rule-field,.notes-field{grid-column:span 12}.summary{grid-template-columns:1fr 1fr}.footer-actions{width:100%}.footer-actions button{flex:1}}
</style>
