import { Routes, Route } from 'react-router-dom'
import Gallery from './pages/Gallery.jsx'
import Detail from './pages/Detail.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/item/:id" element={<Detail />} />
    </Routes>
  )
}
