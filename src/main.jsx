import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client' 
import App from './App.jsx'
import Admin from './Admin.jsx' 

const currentPath = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Se o usuário digitar /administrator, renderiza a página de Admin. Senão, renderiza o App normal */}
    {currentPath === '/administrator' ? <Admin /> : <App />}
  </StrictMode>,
)