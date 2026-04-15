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
import Faculty from './pages/Faculty.jsx'
import FacultyDetail from './pages/FacultyDetail.jsx'
import Matching from './pages/Matching.jsx'
import CaseStudyIdeas from './pages/CaseStudyIdeas.jsx'

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
        <Route path="/faculty" element={<Faculty />} />
        <Route path="/faculty/:id" element={<FacultyDetail />} />
        <Route path="/match" element={<Matching />} />
        <Route path="/case-ideas/:matchId" element={<CaseStudyIdeas />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
