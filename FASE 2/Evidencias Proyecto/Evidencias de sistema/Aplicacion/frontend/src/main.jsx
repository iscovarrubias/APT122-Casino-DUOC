import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-datepicker/dist/react-datepicker.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
