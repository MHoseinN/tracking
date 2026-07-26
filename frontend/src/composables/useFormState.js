import { reactive, ref, toRaw } from 'vue';

function getInitialValues(values) {
  return { ...(typeof values === 'function' ? values() : values) };
}

function clearObject(target) {
  Object.keys(target).forEach((key) => {
    target[key] = '';
  });
}

export function useFormState(initialValues, options = {}) {
  const form = reactive(getInitialValues(initialValues));
  const errors = reactive({});
  const saving = ref(false);

  function clearErrors() {
    clearObject(errors);
  }

  function setValues(values = {}) {
    const nextValues = getInitialValues(values);

    Object.keys(form).forEach((key) => {
      form[key] = nextValues[key] ?? '';
    });

    Object.keys(nextValues).forEach((key) => {
      if (!(key in form)) form[key] = nextValues[key];
    });

    clearErrors();
  }

  function resetForm() {
    setValues(initialValues);
  }

  function validate() {
    clearErrors();
    const validationErrors = options.validate?.(form) || {};
    Object.assign(errors, validationErrors);
    return !Object.values(validationErrors).some(Boolean);
  }

  async function submit(submitHandler) {
    if (saving.value) return { success: false, saving: true };
    if (!validate()) return { success: false, validation: true, errors: { ...errors } };

    saving.value = true;
    try {
      return await submitHandler(toRaw(form));
    } finally {
      saving.value = false;
    }
  }

  return {
    form,
    errors,
    saving,
    clearErrors,
    setValues,
    resetForm,
    validate,
    submit
  };
}
