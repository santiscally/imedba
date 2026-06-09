import { useState, type FormEvent } from 'react'
import { X, Save } from 'lucide-react'
import type { Installment } from '../types/installment'
import { installmentLabel } from '../types/installment'
import { installmentsApi } from '../api/installments'
import './StudentForm.scss'

interface Props {
  installment: Installment
  onClose:    () => void
  onSaved:    () => void
}

// Edición manual del monto / vencimiento / nota de una cuota (reunión 2026-06-05, Nico):
// ej. "acordado: paga la mitad ahora y el resto en dos cuotas". Solo cuotas no pagadas.
export default function InstallmentEditForm({ installment, onClose, onSaved }: Props) {
  const [amount,  setAmount]  = useState(String(installment.amount))
  const [dueDate, setDueDate] = useState(installment.dueDate)
  const [notes,   setNotes]   = useState(installment.notes ?? '')
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    const n = Number(amount)
    if (Number.isNaN(n)) { setError('El monto debe ser un número'); return }
    if (!dueDate) { setError('El vencimiento es obligatorio'); return }
    setSaving(true); setError(null)
    try {
      await installmentsApi.update(installment.id, {
        amount: n,
        dueDate,
        notes: notes.trim() || null,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={ev => ev.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><Save size={18} /></div>
            <h3 className="modal__title">Editar {installmentLabel(installment.number).toLowerCase()}</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <div className="field">
              <label className="field__label">Monto (ARS)<span className="field__required">*</span></label>
              <input type="number" step="1000" value={amount} autoFocus
                onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Vencimiento<span className="field__required">*</span></label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="field field--full">
            <label className="field__label">Aclaración</label>
            <textarea value={notes} rows={3}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej.: acordado paga la mitad ahora y el resto en dos cuotas…" />
            <span className="field__hint">
              Queda registrada en el detalle de la cuota. El recargo no se edita acá
              (hay acción dedicada para condonarlo).
            </span>
          </div>

          {error && <div className="form__error">{error}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
