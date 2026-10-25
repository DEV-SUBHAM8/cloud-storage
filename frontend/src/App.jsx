import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Drive from './pages/Drive'
import PublicLink from './pages/PublicLink'
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/public/:token" element={<PublicLink />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Drive mode="drive" />} />
        <Route path="/folder/:id" element={<Drive mode="drive" />} />
        <Route path="/shared" element={<Drive mode="shared" />} />
        <Route path="/starred" element={<Drive mode="starred" />} />
        <Route path="/trash" element={<Drive mode="trash" />} />
        <Route path="/search" element={<Drive mode="search" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
