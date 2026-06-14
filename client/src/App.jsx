import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import PrivateRoute from './routes/PrivateRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateGroup from './pages/CreateGroup.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import AddExpense from './pages/AddExpense.jsx';
import ExpenseDetail from './pages/ExpenseDetail.jsx';
import Settlement from './pages/Settlement.jsx';
import ImportExpenses from './pages/ImportExpenses.jsx';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1d2e',
                color: '#e2e8f0',
                border: '1px solid #2e3250',
              },
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected */}
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/groups/create" element={<PrivateRoute><CreateGroup /></PrivateRoute>} />
            <Route path="/groups/:groupId" element={<PrivateRoute><GroupDetail /></PrivateRoute>} />
            <Route path="/groups/:groupId/expenses/new" element={<PrivateRoute><AddExpense /></PrivateRoute>} />
            <Route path="/expenses/:expenseId" element={<PrivateRoute><ExpenseDetail /></PrivateRoute>} />
            <Route path="/groups/:groupId/settle" element={<PrivateRoute><Settlement /></PrivateRoute>} />
            <Route path="/groups/:groupId/import" element={<PrivateRoute><ImportExpenses /></PrivateRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
