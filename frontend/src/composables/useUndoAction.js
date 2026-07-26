import { onUnmounted, ref } from 'vue';

export function useUndoAction(options = {}) {
  const timeout = options.timeout || 5000;
  const undoState = ref({
    visible: false,
    title: '',
    message: '',
    handler: null,
    timerId: null
  });

  function clearUndo() {
    if (undoState.value.timerId) {
      window.clearTimeout(undoState.value.timerId);
    }
    undoState.value = { visible: false, title: '', message: '', handler: null, timerId: null };
  }

  function showUndo({ title, message, handler }) {
    clearUndo();
    const timerId = window.setTimeout(() => clearUndo(), timeout);
    undoState.value = { visible: true, title, message, handler, timerId };
  }

  async function handleUndo() {
    if (!undoState.value.handler) return;
    const undoHandler = undoState.value.handler;
    clearUndo();

    try {
      await undoHandler();
      options.onSuccess?.();
    } catch (error) {
      options.onError?.(error);
    }
  }

  onUnmounted(clearUndo);

  return {
    undoState,
    clearUndo,
    showUndo,
    handleUndo
  };
}
