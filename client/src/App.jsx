import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Problems from './pages/Problems.jsx';
import ProblemDetail from './pages/ProblemDetail.jsx';
import Submissions from './pages/Submissions.jsx';
import SetProblem from './pages/SetProblem.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleGuard from './components/RoleGuard.jsx';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/problems" element={<Problems />} />
            <Route path="/problems/:id" element={<ProblemDetail />} />
            <Route path="/submissions" element={
                <ProtectedRoute><Submissions /></ProtectedRoute>
            } />
            <Route path="/set-problem" element={
                <ProtectedRoute><RoleGuard role="PROBLEM_SETTER"><SetProblem /></RoleGuard></ProtectedRoute>
            } />
        </Routes>
    );
}
