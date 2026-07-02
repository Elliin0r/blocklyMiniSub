const MAX_TRACE_ENTRIES = 25;

export function createTraceStore(onChange) {
  const entries = [];

  function notify() {
    onChange([...entries]);
  }

  return {
    add(entry) {
      entries.unshift({
        id: createTraceId(),
        createdAt: new Date().toISOString(),
        ...entry
      });

      if (entries.length > MAX_TRACE_ENTRIES) {
        entries.length = MAX_TRACE_ENTRIES;
      }

      notify();
    },
    clear() {
      entries.length = 0;
      notify();
    },
    getEntries() {
      return [...entries];
    }
  };
}

function createTraceId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
