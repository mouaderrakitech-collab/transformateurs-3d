import { createRoot } from 'react-dom/client'
import './print.css'
import { Deck } from './Deck'

createRoot(document.getElementById('root')!).render(<Deck />)

// Signal pour le générateur PDF : images chargées et mise en page stable
Promise.all(
  Array.from(document.images).map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r }))),
).then(() => document.fonts.ready).then(() => {
  setTimeout(() => {
    const imgs = Array.from(document.images)
    Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r })))).then(() => {
      ;(window as unknown as { __ready: boolean }).__ready = true
    })
  }, 300)
})
