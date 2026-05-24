// src/components/Toast.jsx
import './Toast.css'

export default function Toast({ message }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-check" aria-hidden="true">✓</span>
      {message}
    </div>
  )
}
