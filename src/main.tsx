import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './AppPlatform'
import './styles.css'
import './v2.css'
import './platform.css'
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
