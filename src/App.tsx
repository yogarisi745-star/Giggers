import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import MainLayout from './components/layout/MainLayout';
import Auth from './pages/Auth';
import Home from './pages/Home';
import PostJob from './pages/PostJob';
import MyPostings from './pages/MyPostings';
import Chats from './pages/Chats';
import ChatThread from './pages/ChatThread';
import Wallet from './pages/Wallet';
import Notifications from './pages/Notifications';
import JobDetail from './pages/JobDetail';
import JobApplicants from './pages/JobApplicants';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/my-postings" element={<ProtectedRoute><MyPostings /></ProtectedRoute>} />
        <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
        <Route path="/chats/:chatId" element={<ProtectedRoute><ChatThread /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/job/:jobId/applicants" element={<ProtectedRoute><JobApplicants /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
