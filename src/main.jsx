import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProfileNew from './pages/ProfileNew.jsx'
import ProfileEdit from './pages/ProfileEdit.jsx'
import ProfileDetail from './pages/ProfileDetail.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile/new" element={<ProfileNew />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/:id" element={<ProfileDetail />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
