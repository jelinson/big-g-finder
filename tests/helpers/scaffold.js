/**
 * Shared DOM scaffold for frontend tests.
 * Matches the structure of index.html — update here when the HTML changes.
 *
 * @param {Object} [options]
 * @param {string} [options.locGridInner] - Override the default loc-grid cards HTML
 * @returns {string} innerHTML for document.body
 */
export function buildScaffold({ locGridInner } = {}) {
  const defaultCards = `
        <a href="https://sweetcow.com/pearl-st/" target="_blank" data-slug="pearl-st">
          <div class="result-card loading">
            <div class="location-name">Pearl St</div>
            <div class="location-address">1100 Pearl St</div>
            <span class="status loading">⟳ Loading</span>
          </div>
        </a>`;

  return `
    <div class="container">
      <div class="flavor-pill">
        <select id="flavorSelect"></select>
      </div>
      <div id="results"></div>
      <div id="loc-summary">
        <div id="loc-summary-text">🔍 Checking all locations…</div>
        <div id="notif-section" style="display:none">
          <button type="button" id="notif-trigger">🔔 Get notified</button>
          <div id="notif-form" style="display:none">
            <form id="subscribe-form">
              <input type="email" id="subscribe-email">
              <span id="notif-flavor"></span>
              <div id="location-checkboxes"></div>
              <button type="submit" id="subscribe-btn">Notify Me!</button>
            </form>
          </div>
        </div>
      </div>
      <div id="loc-grid">
        ${locGridInner ?? defaultCards}
      </div>
    </div>
  `;
}
