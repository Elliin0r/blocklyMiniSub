export function renderTracePanel(container, entries) {
  if (!entries.length) {
    container.innerHTML = '<p class="empty-trace">No executions yet.</p>';
    return;
  }

  container.innerHTML = entries.map(renderTraceEntry).join("");
}

function renderTraceEntry(entry) {
  const state = entry.error ? "error" : entry.response?.ok ? "ok" : "warn";
  const response = entry.response
    ? formatJson(entry.response)
    : "No HTTP response received.";
  const error = entry.error ? `<pre>${escapeHtml(formatJson(entry.error))}</pre>` : "";

  return `
    <article class="trace-entry trace-entry--${state}">
      <div class="trace-entry__header">
        <strong>${escapeHtml(entry.command)}</strong>
        <time>${escapeHtml(formatTime(entry.createdAt))}</time>
      </div>
      <div class="trace-grid">
        <section>
          <h3>Generated JSON</h3>
          <pre>${escapeHtml(formatJson(entry.generatedJson))}</pre>
        </section>
        <section>
          <h3>HTTP Request</h3>
          <pre>${escapeHtml(formatJson(entry.request))}</pre>
        </section>
        <section>
          <h3>HTTP Response</h3>
          <pre>${escapeHtml(response)}</pre>
        </section>
        ${entry.error ? `<section><h3>Errors</h3>${error}</section>` : ""}
      </div>
    </article>
  `;
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
