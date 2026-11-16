// Minimal DOM HUD shared by AR and preview mode.
const $ = (id) => document.getElementById(id);

export function createHud() {
  const title = $('hud-title'), caption = $('hud-caption'), hint = $('hud-hint'), error = $('hud-error');
  return {
    setTitle(text) { title.textContent = text; },
    setCaption(text) {
      caption.textContent = text || '';
      caption.classList.toggle('hidden', !text);
    },
    showHint(html) { hint.innerHTML = html; hint.classList.remove('hidden'); },
    hideHint() { hint.classList.add('hidden'); },
    showError(html) { error.innerHTML = html; error.classList.remove('hidden'); },
    hideError() { error.classList.add('hidden'); },
    setModeLink(text, href) { const a = $('hud-mode-link'); a.textContent = text; a.href = href; a.classList.toggle('hidden', !text); },
    setClean(on) { $('hud').classList.toggle('clean', on); },
    picker: { root: $('hud-picker'), select: $('hud-select'), prev: $('hud-prev'), next: $('hud-next'), restart: $('hud-restart') },
  };
}
