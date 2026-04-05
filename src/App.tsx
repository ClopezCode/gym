import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './components/AuthProvider'
import { ExerciseDetailPage } from './pages/ExerciseDetailPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { ProgressPage } from './pages/ProgressPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { LoginPage } from './pages/LoginPage'
import { WorkoutHistoryDetailPage } from './pages/WorkoutHistoryDetailPage'
import { WorkoutPage } from './pages/WorkoutPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/routines" element={<RoutinesPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route
              path="/history/:workoutId"
              element={<WorkoutHistoryDetailPage />}
            />
            <Route path="/workouts/:workoutId" element={<WorkoutPage />} />
            <Route
              path="/exercises/:exerciseId"
              element={<ExerciseDetailPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
