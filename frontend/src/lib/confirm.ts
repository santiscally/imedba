import Swal from 'sweetalert2'

// Wrapper de SweetAlert2 con la línea visual de IMEDBA (verde petróleo).
// Centraliza confirmaciones, errores y toasts para mantener consistencia.

const BRAND  = '#08323C' // $verde-petroleo
const DANGER = '#dc2626' // $rojo
const GREY   = '#6b7280' // $gris-texto

interface ConfirmOptions {
  title:        string
  text?:        string
  html?:        string
  confirmText?: string
  cancelText?:  string
  icon?:        'warning' | 'question' | 'info' | 'error' | 'success'
  danger?:      boolean
}

export async function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  const res = await Swal.fire({
    title:             opts.title,
    text:              opts.text,
    html:              opts.html,
    icon:              opts.icon ?? 'question',
    showCancelButton:  true,
    confirmButtonText: opts.confirmText ?? 'Confirmar',
    cancelButtonText:  opts.cancelText  ?? 'Cancelar',
    confirmButtonColor: opts.danger ? DANGER : BRAND,
    cancelButtonColor:  GREY,
    reverseButtons:    true,
    focusCancel:       opts.danger ?? false,
  })
  return res.isConfirmed
}

export function alertError(title: string, text?: string): void {
  void Swal.fire({ icon: 'error', title, text, confirmButtonColor: BRAND })
}

export function toastSuccess(title: string): void {
  void Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  })
}
