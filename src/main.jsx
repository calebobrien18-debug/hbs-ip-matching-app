import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout.jsx'
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
import SavedIdeas from './pages/SavedIdeas.jsx'
import AdminFeedback from './pages/AdminFeedback.jsx'
import CourseMatch from './pages/CourseMatch.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public — Landing handles its own layout + footer */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Authenticated — Layout appends the feedback-enabled footer */}
        <Route path="/dashboard"       element={<Layout><Dashboard /></Layout>} />
        <Route path="/profile/new"     element={<Layout><ProfileNew /></Layout>} />
        <Route path="/profile/edit"    element={<Layout><ProfileEdit /></Layout>} />
        <Route path="/profile/:id"     element={<Layout><ProfileDetail /></Layout>} />
        <Route path="/faculty"         element={<Layout><Faculty /></Layout>} />
        <Route path="/faculty/:id"     element={<Layout><FacultyDetail /></Layout>} />
        <Route path="/match"           element={<Layout><Matching /></Layout>} />
        <Route path="/course-match"    element={<Layout><CourseMatch /></Layout>} />
        <Route path="/case-ideas/:matchId" element={<Layout><CaseStudyIdeas /></Layout>} />
        <Route path="/saved-ideas"         element={<Layout><SavedIdeas /></Layout>} />
        <Route path="/admin/feedback"      element={<AdminFeedback />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
