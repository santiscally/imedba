import './Footer.scss'

// Footer chico global: copyright IMEDBA + crédito "powered by <s/a>" (Simple Apps).
// El logo <s/a> va en navy de marca (#092F70); el resto usa la paleta del sitio.
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="app-footer">
      <span className="app-footer__copy">
        © {year} IMEDBA® · Todos los derechos reservados
      </span>
      <a
        className="powered-by"
        href="https://simpleapps.com.ar"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="powered by Simple Apps"
      >
        <span className="powered-text">powered by</span>
        <span className="powered-logo">{'<s/a>'}</span>
      </a>
    </footer>
  )
}
