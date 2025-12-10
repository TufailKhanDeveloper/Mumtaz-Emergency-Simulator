import { createRoot } from 'react-dom/client'
// import './index.css' 
import './style.css'
// OR 
// import './assets/index.css'
import App from './App.jsx'
import React, { StrictMode } from 'react'
import './assets/index.css' 
import { BrowserRouter } from 'react-router-dom'
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
   <StrictMode>
    <App />
  </StrictMode>
  </BrowserRouter>
)
