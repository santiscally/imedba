import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { X, Save, FilePlus2, Plus } from 'lucide-react'
import type {
  Enrollment,
  EnrollmentCreateRequest,
  EnrollmentUpdateRequest,
  PaymentGroup,
} from '../types/enrollment'
import {
  PAYMENT_GROUPS, PAYMENT_GROUP_LABELS,
} from '../types/enrollment'
import type { Student } from '../types/student'
import type { Course } from '../types/course'
import type { Collection } from '../types/collection'
import { COLLECTION_VARIANT_LABELS } from '../types/collection'
import type { Book } from '../types/book'
import { studentsApi } from '../api/students'
import { coursesApi } from '../api/courses'
import { collectionsApi } from '../api/collections'
import { booksApi } from '../api/books'
import './StudentForm.scss'

type CreatePayload = EnrollmentCreateRequest
type UpdatePayload = EnrollmentUpdateRequest

interface Props {
  mode:     'create' | 'edit'
  initial?: Enrollment
  onClose:  () => void
  onSaved:  (saved: Enrollment) => void
  onSubmit: (payload: CreatePayload | UpdatePayload) => Promise<Enrollment>
}

interface FormState {
  studentId:          string
  courseId:           string
  listPrice:          string
  discountMode:       'PCT' | 'AMOUNT'
  discountValue:      string
  bookPrice:          string
  enrollmentFee:      string
  numInstallments:    string
  paymentGroup:       PaymentGroup
  useTotalDistribution: boolean
  notes:              string
}

function initialState(e?: Enrollment): FormState {
  return {
    studentId:          e?.student.id ?? '',
    courseId:           e?.course.id  ?? '',
    listPrice:          e?.listPrice          != null ? String(e.listPrice)          : '',
    discountMode:       'PCT',
    discountValue:      e?.discountPercentage != null ? String(e.discountPercentage) : '',
    bookPrice:          e?.bookPrice          != null ? String(e.bookPrice)          : '',
    enrollmentFee:      e?.enrollmentFee      != null ? String(e.enrollmentFee)      : '',
    numInstallments:    e?.numInstallments    != null ? String(e.numInstallments)    : '',
    paymentGroup:       e?.paymentGroup       ?? 'GROUP_1',
    useTotalDistribution: false,
    notes:              e?.notes              ?? '',
  }
}

export default function EnrollmentForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const [state,       setState]       = useState<FormState>(initialState(initial))
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  const [students, setStudents] = useState<Student[]>([])
  const [courses,  setCourses]  = useState<Course[]>([])
  // Catálogo para el selector de "Libros / Colección" de la inscripción.
  // Reglas (reunión 06-08): o una colección (y listo), o varios libros sueltos.
  const [collections, setCollections]   = useState<Collection[]>([])
  const [books,       setBooks]         = useState<Book[]>([])
  const [collectionId, setCollectionId] = useState('')
  const [bookIds,     setBookIds]       = useState<string[]>([])
  const [addBookId,   setAddBookId]     = useState('')

  const isCreate = mode === 'create'

  // Carga sólo en create — en edit, student/course son inmutables y se muestran read-only.
  useEffect(() => {
    if (!isCreate) return
    Promise.all([
      studentsApi.list({ size: 200, sort: 'lastName,asc' }),
      coursesApi.list({ size: 200, sort: 'name,asc' }),
      collectionsApi.list(true),
      booksApi.list({ active: true, size: 500, sort: 'name,asc' }),
    ]).then(([studentsRes, coursesRes, colls, booksRes]) => {
      setStudents(studentsRes.content)
      setCourses(coursesRes.content)
      setCollections(colls)
      setBooks(booksRes.content)
    }).catch(() => { /* el form funciona igual aun si falla — los selects quedan vacíos */ })
  }, [isCreate])

  // Precio con descuento alumno de un libro suelto.
  function bookNet(b: Book): number {
    return b.salePrice == null ? 0 : Math.round(b.salePrice * (1 - (b.studentDiscountPct ?? 0) / 100))
  }

  function pickCollection(id: string) {
    setCollectionId(id)
    if (id) { setBookIds([]); setAddBookId('') }   // colección = excluye libros sueltos
  }

  function addBook() {
    if (!addBookId || bookIds.includes(addBookId)) return
    setBookIds(prev => [...prev, addBookId])
    setAddBookId('')
  }

  function removeBook(id: string) {
    setBookIds(prev => prev.filter(x => x !== id))
  }

  // Precio de libros (lo que va a `bookPrice`): colección o suma de libros sueltos.
  const librosPrice = useMemo(() => {
    if (collectionId) {
      const c = collections.find(x => x.id === collectionId)
      return c ? Math.round(c.price * (1 - (c.studentDiscountPct ?? 0) / 100)) : 0
    }
    return bookIds.reduce((acc, id) => {
      const b = books.find(x => x.id === id)
      return acc + (b ? bookNet(b) : 0)
    }, 0)
  }, [collectionId, bookIds, collections, books])

  // Descuento efectivo en %: si se cargó como monto, se convierte usando el precio de lista.
  // El descuento aplica SÓLO al curso — la matrícula no lleva descuento (reunión 06-05).
  const discountPct = useMemo(() => {
    const v = Number(state.discountValue) || 0
    if (v <= 0) return 0
    if (state.discountMode === 'PCT') return v
    const course = courses.find(c => c.id === state.courseId)
    const lista = state.listPrice ? Number(state.listPrice) : (course?.coursePrice ?? 0)
    return lista > 0 ? Math.round((v / lista) * 10000) / 100 : 0
  }, [state.discountValue, state.discountMode, state.listPrice, state.courseId, courses])

  // Total en vivo: curso (con descuento) + matrícula (sin descuento) + libros.
  const totals = useMemo(() => {
    const course = courses.find(c => c.id === state.courseId)
    const lista = state.listPrice ? Number(state.listPrice) : (course?.coursePrice ?? 0)
    const curso = Math.round((lista || 0) * (1 - discountPct / 100))
    const matricula = state.enrollmentFee ? Number(state.enrollmentFee) : (course?.enrollmentPrice ?? 0)
    const libros = isCreate ? librosPrice : (state.bookPrice ? Number(state.bookPrice) : 0)
    return { curso, matricula: matricula || 0, libros, total: curso + (matricula || 0) + libros }
  }, [courses, state.courseId, state.listPrice, discountPct, state.enrollmentFee, state.bookPrice, librosPrice, isCreate])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (isCreate && !state.studentId) e.studentId = 'Obligatorio'
    if (isCreate && !state.courseId)  e.courseId  = 'Obligatorio'

    if (state.discountValue) {
      const n = Number(state.discountValue)
      if (Number.isNaN(n) || n < 0) e.discountValue = 'Debe ser ≥ 0'
    }
    for (const k of ['listPrice','bookPrice','enrollmentFee'] as const) {
      if (state[k]) {
        const n = Number(state[k])
        if (Number.isNaN(n) || n < 0) e[k] = 'Debe ser ≥ 0'
      }
    }
    if (state.numInstallments) {
      const n = Number(state.numInstallments)
      if (!Number.isInteger(n) || n < 1) e.numInstallments = 'Entero ≥ 1'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const num = (v: string) => v ? Number(v) : null

    try {
      if (isCreate) {
        const payload: CreatePayload = {
          studentId:          state.studentId,
          courseId:           state.courseId,
          listPrice:          num(state.listPrice),
          discountPercentage: discountPct || null,
          bookPrice:          librosPrice || null,
          enrollmentFee:      num(state.enrollmentFee),
          numInstallments:    num(state.numInstallments),
          paymentGroup:       state.paymentGroup,
          useTotalDistribution: state.useTotalDistribution,
          notes:              state.notes.trim() || null,
        }
        const saved = await onSubmit(payload)
        onSaved(saved)
      } else {
        const payload: UpdatePayload = {
          listPrice:          num(state.listPrice),
          discountPercentage: discountPct || null,
          bookPrice:          num(state.bookPrice),
          enrollmentFee:      num(state.enrollmentFee),
          numInstallments:    num(state.numInstallments),
          notes:              state.notes.trim() || null,
        }
        const saved = await onSubmit(payload)
        onSaved(saved)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  const Icon = isCreate ? FilePlus2 : Save

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={ev => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><Icon size={18} /></div>
            <h3 className="modal__title">
              {isCreate ? 'Nueva inscripción' : 'Editar inscripción'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Alumno" required error={errors.studentId} fullWidth>
              {isCreate ? (
                <select
                  value={state.studentId}
                  onChange={e => setField('studentId', e.target.value)}
                  autoFocus
                >
                  <option value="">Seleccionar alumno…</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.lastName}, {s.firstName} — {s.email}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={`${initial!.student.lastName}, ${initial!.student.firstName}`}
                  disabled
                />
              )}
            </Field>

            <Field label="Curso" required error={errors.courseId} fullWidth>
              {isCreate ? (
                <select
                  value={state.courseId}
                  onChange={e => setField('courseId', e.target.value)}
                >
                  <option value="">Seleccionar curso…</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.code ? ` — ${c.code}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={`${initial!.course.name}${initial!.course.code ? ` — ${initial!.course.code}` : ''}`}
                  disabled
                />
              )}
            </Field>

            <Field label="Precio de lista (ARS)" error={errors.listPrice}>
              <input
                type="number"
                min="0"
                step="1000"
                value={state.listPrice}
                onChange={e => setField('listPrice', e.target.value)}
                placeholder="Si queda vacío, toma el del curso"
              />
            </Field>

            <Field label="Descuento" error={errors.discountValue}>
              <div className="discount-input">
                <select
                  value={state.discountMode}
                  onChange={e => setField('discountMode', e.target.value as 'PCT' | 'AMOUNT')}
                  aria-label="Tipo de descuento"
                >
                  <option value="PCT">%</option>
                  <option value="AMOUNT">$</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.discountValue}
                  onChange={e => setField('discountValue', e.target.value)}
                  placeholder="0"
                />
              </div>
              {state.discountMode === 'AMOUNT' && state.discountValue && (
                <span className="field__hint">≈ {discountPct}% del precio de lista (la matrícula no lleva descuento)</span>
              )}
            </Field>

            <Field label="Libros / Colección" error={errors.bookPrice} fullWidth>
              {isCreate ? (
                <div className="book-picker">
                  <select value={collectionId} onChange={e => pickCollection(e.target.value)}>
                    <option value="">— Sin colección —</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({COLLECTION_VARIANT_LABELS[c.variant]}) — {formatARS(Math.round(c.price * (1 - (c.studentDiscountPct ?? 0) / 100)))}
                      </option>
                    ))}
                  </select>

                  {!collectionId && (
                    <>
                      <div className="book-picker__add">
                        <select value={addBookId} onChange={e => setAddBookId(e.target.value)}>
                          <option value="">Agregar libro suelto…</option>
                          {books.filter(b => !bookIds.includes(b.id)).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <button type="button" className="btn-ghost btn-ghost--sm" disabled={!addBookId} onClick={addBook}>
                          <Plus size={14} /> Agregar
                        </button>
                      </div>
                      {bookIds.length > 0 && (
                        <ul className="book-picker__list">
                          {bookIds.map(id => {
                            const b = books.find(x => x.id === id)
                            if (!b) return null
                            return (
                              <li key={id}>
                                <span className="book-picker__name">{b.name}</span>
                                <span className="muted">{formatARS(bookNet(b))}</span>
                                <button type="button" className="book-picker__rm" onClick={() => removeBook(id)} aria-label="Quitar">
                                  <X size={14} />
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </>
                  )}
                  <span className="field__hint">
                    {collectionId
                      ? 'Colección elegida — incluye todos sus libros, no hace falta agregar más.'
                      : 'Elegí una colección, o agregá uno o varios libros sueltos.'}
                  </span>
                </div>
              ) : (
                <input type="number" value={state.bookPrice} disabled
                  title="Los libros se eligen al crear la inscripción" />
              )}
            </Field>

            <Field label="Matrícula (ARS)" error={errors.enrollmentFee}>
              <input
                type="number"
                min="0"
                step="1000"
                value={state.enrollmentFee}
                onChange={e => setField('enrollmentFee', e.target.value)}
                placeholder="Si queda vacío, toma la del curso"
              />
            </Field>

            <Field label="Cantidad de cuotas" error={errors.numInstallments}>
              <input
                type="number"
                min="1"
                step="1"
                value={state.numInstallments}
                onChange={e => setField('numInstallments', e.target.value)}
                placeholder="1"
              />
            </Field>

            <Field label="Grupo de pago">
              <select
                value={state.paymentGroup}
                onChange={e => setField('paymentGroup', e.target.value as PaymentGroup)}
                disabled={!isCreate}
                title={isCreate ? undefined : 'El grupo se define al crear la inscripción'}
              >
                {PAYMENT_GROUPS.map(g => (
                  <option key={g} value={g}>{PAYMENT_GROUP_LABELS[g]}</option>
                ))}
              </select>
              <span className="field__hint">
                Define el día de vencimiento de las cuotas y cuándo corre el recargo del 5%
                (G1: vence 10 / recargo 11 — G2: vence 20 / recargo 21).
              </span>
            </Field>
          </div>

          {isCreate && (
            <div className="enroll-total">
              <div className="enroll-total__row"><span>Curso (con descuento)</span><span>{formatARS(totals.curso)}</span></div>
              <div className="enroll-total__row"><span>Matrícula</span><span>{formatARS(totals.matricula)}</span></div>
              <div className="enroll-total__row"><span>Libros</span><span>{formatARS(totals.libros)}</span></div>
              <div className="enroll-total__row enroll-total__row--total"><span>Total</span><span>{formatARS(totals.total)}</span></div>
            </div>
          )}

          {isCreate && (
            <div className="field field--full">
              <label className="field__check">
                <input
                  type="checkbox"
                  checked={state.useTotalDistribution}
                  onChange={e => setField('useTotalDistribution', e.target.checked)}
                />
                <span>Agrupar todo en las cuotas (suma total)</span>
              </label>
              <span className="field__hint">
                {state.useTotalDistribution
                  ? 'Se suma curso + matrícula + libros y se divide en N cuotas iguales (sin matrícula como cuota aparte).'
                  : 'La matrícula se cobra como cuota 0 y el curso se divide en N cuotas. Los libros se cobran aparte.'}
              </span>
            </div>
          )}

          <Field label="Observaciones" fullWidth>
            <textarea
              value={state.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={3}
              placeholder="Notas internas de la vendedora…"
            />
          </Field>

          {isCreate && (
            <p className="form__note">
              Al crear una inscripción el backend genera automáticamente el
              cronograma de <code>installments</code> (cuotas). Este SPA sólo las consulta.
            </p>
          )}

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear inscripción' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function formatARS(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

function Field(props: {
  label:      string
  required?:  boolean
  error?:     string
  fullWidth?: boolean
  children:   React.ReactNode
}) {
  return (
    <div className={`field ${props.fullWidth ? 'field--full' : ''} ${props.error ? 'field--error' : ''}`}>
      <label className="field__label">
        {props.label}
        {props.required && <span className="field__required">*</span>}
      </label>
      {props.children}
      {props.error && <div className="field__error">{props.error}</div>}
    </div>
  )
}
