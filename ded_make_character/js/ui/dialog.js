import { html, toElement } from '../core/dom.js';
import { icon } from './icons.js';

/**
 * Diálogo de confirmação modal (<dialog> nativo: foco preso, Esc cancela).
 * Resolve true quando o usuário confirma.
 *
 * A resposta é lida já no `submit` do formulário (síncrono) e no `cancel` (Esc);
 * o evento `close` fica só como reserva. Assim a promessa nunca fica pendente,
 * mesmo quando o navegador atrasa o `close` (ex.: aba em segundo plano).
 */
export function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'danger', glyph } = {}) {
  return new Promise(resolve => {
    const dialog = toElement(html`
      <dialog class="dialog" aria-labelledby="dlg-title" aria-describedby="dlg-text">
        <form method="dialog">
          <div class="dialog__body">
            <span class="dialog__icon ${tone === 'danger' ? '' : 'dialog__icon--gold'}">${icon(glyph || (tone === 'danger' ? 'trash' : 'restore'))}</span>
            <div>
              <h2 class="dialog__title" id="dlg-title">${title}</h2>
              <p class="dialog__text" id="dlg-text">${message}</p>
            </div>
          </div>
          <div class="dialog__actions">
            <button type="submit" value="cancel" class="btn btn--ghost" data-autofocus>${cancelLabel}</button>
            <button type="submit" value="confirm" class="btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}">${confirmLabel}</button>
          </div>
        </form>
      </dialog>`);

    const opener = document.activeElement;
    let settled = false;
    const finish = confirmed => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close(confirmed ? 'confirm' : 'cancel');
      dialog.remove();
      if (opener && opener.isConnected) opener.focus();
      resolve(confirmed);
    };

    dialog.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      finish(event.submitter?.value === 'confirm');
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      finish(false);
    });
    dialog.addEventListener('close', () => finish(dialog.returnValue === 'confirm'));
    dialog.addEventListener('click', event => {
      // Clique no fundo (fora da caixa) cancela.
      if (event.target === dialog) finish(false);
    });

    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('[data-autofocus]').focus();
  });
}
