import { computed, ref } from 'vue';
import { useFormState } from './useFormState';
import { getDuplicatePhoneError, validateCustomerIdentity } from '../utils/validators/customerValidators';

const ACCOUNT_STATUS_OPTIONS = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];
const EMPTY_PROFILE = { first_name: '', last_name: '', phone: '', referrer: '', account_status: '' };

export function useCustomerProfileForm({ customer, allCustomers, customerId, invoiceStore, toast, reloadCustomers }) {
  const customerNotesDraft = ref('');
  const accountStatusSelectOptions = [
    { label: 'وضعیت حساب', value: '' },
    ...ACCOUNT_STATUS_OPTIONS.map((option) => ({ label: option, value: option }))
  ];
  const {
    form: customerProfileDraft,
    saving: customerFormSaving,
    submit: submitCustomerForm,
    setValues: setCustomerProfile
  } = useFormState(EMPTY_PROFILE, {
    validate: (values) => validateCustomerIdentity(values, {
      existingCustomers: allCustomers.value,
      currentCustomerId: customerId.value
    })
  });

  const profileChanged = computed(() => ['first_name', 'last_name', 'phone', 'referrer', 'account_status']
    .some((field) => String(customer.value?.[field] || '').trim() !== String(customerProfileDraft[field] || '').trim()));
  const notesChanged = computed(() => String(customer.value?.notes || '').trim() !== customerNotesDraft.value.trim());
  const customerFormChanged = computed(() => profileChanged.value || notesChanged.value);
  const phoneDuplicateError = computed(() => getDuplicatePhoneError(
    customerProfileDraft.phone, allCustomers.value, customerId.value
  ));

  function resetFromCustomer() {
    setCustomerProfile({
      first_name: customer.value?.first_name || '',
      last_name: customer.value?.last_name || '',
      phone: customer.value?.phone || '',
      referrer: customer.value?.referrer || '',
      account_status: customer.value?.account_status || ''
    });
    customerNotesDraft.value = customer.value?.notes || '';
  }

  function updateProfileField(field, value) {
    if (Object.prototype.hasOwnProperty.call(customerProfileDraft, field)) customerProfileDraft[field] = value;
  }

  async function saveCustomerForm() {
    if (!customerFormChanged.value) return;
    const result = await submitCustomerForm(async (values) => {
      if (profileChanged.value && !(await saveProfile(values))) return { success: false };
      if (notesChanged.value && !(await saveNotes())) return { success: false };
      resetFromCustomer();
      return { success: true };
    });

    if (result.validation) {
      toast.error(result.errors.phone || 'نام و نام خانوادگی الزامی است');
      return;
    }
    if (result.success) toast.success('اطلاعات مشتری با موفقیت ذخیره شد');
  }

  async function saveProfile(values) {
    const profileResult = await invoiceStore.updateCustomerProfile(customerId.value, {
      first_name: String(values.first_name || '').trim(),
      last_name: String(values.last_name || '').trim(),
      phone: String(values.phone || '').trim() || null,
      referrer: String(values.referrer || '').trim() || null,
      account_status: String(values.account_status || '').trim() || null
    });
    if (!profileResult.success) {
      toast.error(profileResult.message || 'ذخیره مشخصات مشتری با خطا مواجه شد');
      return false;
    }
    customer.value = { ...customer.value, ...profileResult.data };
    await reloadCustomers();
    return true;
  }

  async function saveNotes() {
    const notesResult = await invoiceStore.updateCustomerNotes(customerId.value, customerNotesDraft.value);
    if (!notesResult.success) {
      toast.error(notesResult.message || 'ذخیره توضیحات با خطا مواجه شد');
      return false;
    }
    customer.value = { ...customer.value, notes: notesResult.data?.notes || '' };
    return true;
  }

  return {
    customerProfileDraft,
    customerNotesDraft,
    accountStatusSelectOptions,
    customerFormSaving,
    customerFormChanged,
    phoneDuplicateError,
    resetFromCustomer,
    updateProfileField,
    saveCustomerForm
  };
}
