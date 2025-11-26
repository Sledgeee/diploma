import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { Toaster } from 'sonner';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Books } from './pages/Books';
// import { BookDetails } from './pages/BookDetails';
// import { MyLoans } from './pages/MyLoans';
// import { Profile } from './pages/Profile';
// import { Statistics } from './pages/Statistics';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          {/* Private routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="books" element={<Books />} />
            {/* <Route path="books/:id" element={<BookDetails />} /> */}
            {/* <Route path="my-loans" element={<MyLoans />} /> */}
            {/* <Route path="profile" element={<Profile />} /> */}
            {/* <Route
              path="statistics"
              element={
                <PrivateRoute roles={['ADMIN', 'LIBRARIAN']}>
                  <Statistics />
                </PrivateRoute>
              }
            /> */}
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </Provider>
  );
}

export default App;