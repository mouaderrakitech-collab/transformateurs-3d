import { useState } from 'react'
import { useApp } from '../store'

/**
 * Import d'une présentation existante.
 * Un fichier PPTX doit d'abord être converti en PDF (PowerPoint : Fichier › Exporter › PDF).
 * Chaque page est rendue en image et insérée comme diapositive, avant « Questions / réponses ».
 * Limite : les animations natives PowerPoint ne sont pas conservées.
 */
export function PdfImport() {
  const add = useApp((s) => s.addImportedPages)
  const clear = useApp((s) => s.clearImportedPages)
  const count = useApp((s) => s.importedPages.length)
  const [status, setStatus] = useState<string>('')

  async function onFile(file: File) {
    try {
      setStatus('Chargement de PDF.js…')
      const pdfjs = await import('pdfjs-dist')
      const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      pdfjs.GlobalWorkerOptions.workerSrc = worker
      const data = new Uint8Array(await file.arrayBuffer())
      const doc = await pdfjs.getDocument({ data }).promise
      const pages = []
      for (let i = 1; i <= doc.numPages; i++) {
        setStatus(`Rendu de la page ${i} / ${doc.numPages}…`)
        const page = await doc.getPage(i)
        const vp0 = page.getViewport({ scale: 1 })
        const scale = Math.min(3, 1920 / vp0.width)
        const vp = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(vp.width)
        canvas.height = Math.round(vp.height)
        await page.render({ canvas, viewport: vp }).promise
        pages.push({
          id: `${Date.now()}-${i}`,
          title: `${file.name.replace(/\.pdf$/i, '')} — p. ${i}`,
          image: canvas.toDataURL('image/jpeg', 0.9),
        })
      }
      add(pages)
      setStatus(`${doc.numPages} page(s) importée(s), insérées avant « Questions / réponses ».`)
    } catch (e) {
      setStatus('Échec de l’import : ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-3">
        PPTX : exporter d’abord en PDF depuis PowerPoint. Le contenu de chaque page est conservé sous forme d’image ; les animations PowerPoint ne le sont pas.
      </p>
      <label className="btn w-full">
        Importer un PDF…
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          data-testid="pdf-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
      </label>
      {count > 0 && (
        <button className="btn w-full" onClick={clear}>
          Retirer les {count} page(s) importée(s)
        </button>
      )}
      {status && <p className="text-xs text-ink-2" data-testid="pdf-status">{status}</p>}
    </div>
  )
}
