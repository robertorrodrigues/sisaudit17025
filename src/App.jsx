
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Pedidos from '@/pages/Pedidos';
import OrdemServico from '@/pages/OrdemServico';
import OrdemServicoNew from '@/pages/OrdemServicoNew';
import Agenda from '@/pages/Agenda';
import Equipamentos from '@/pages/Equipamentos';
import EquipamentoAlocacao from '@/pages/EquipamentoAlocacao';
import Tecnicos from '@/pages/Tecnicos';
import Validacao from '@/pages/Validacao';
import Relatorios from '@/pages/Relatorios';
import Configuracoes from '@/pages/Configuracoes';
import Certificados from '@/pages/Certificados';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import NotFound from '@/pages/NotFound';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {SettingsProvider} from "@/contexts/SettingsContext";




const getCompanySlug = (pathname) => {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  return firstSegment && !['login', 'signup'].includes(firstSegment) ? firstSegment : null;
};

const CompanyScopedPage = () => {
  const location = useLocation();
  const currentPath = location.pathname.replace(/^\/[^/]+/, '') || '/';

  if (currentPath.startsWith('/equipamentos/alocacao/')) {
    return <EquipamentoAlocacao />;
  }

  switch (currentPath) {
    case '/':
      return <Dashboard />;
    case '/pedidos':
      return <Pedidos />;
    case '/equipamentos':
      return <Equipamentos />;
    case '/ordem-servico':
      return <OrdemServico />;
    case '/agenda':
      return <Agenda />;
    case '/tecnicos':
      return <Tecnicos />;
    case '/validacao':
      return <Validacao />;
    case '/certificados':
      return <Certificados />;
    case '/relatorios':
      return <Relatorios />;
    case '/configuracoes':
      return <Configuracoes />;
    default:
      return <NotFound />;
  }
};

const CompanyLoginPage = () => {
  const { empresaSlug } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return !user ? <Login companySlug={empresaSlug} /> : <Navigate to={`/${empresaSlug}`} replace />;
};

const CompanySignupPage = () => {
  const { empresaSlug } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return !user ? <Signup companySlug={empresaSlug} /> : <Navigate to={`/${empresaSlug}`} replace />;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
      <Route path="/:empresaSlug/login" element={<CompanyLoginPage />} />
      <Route path="/:empresaSlug/signup" element={<CompanySignupPage />} />
      <Route
        path="/:empresaSlug/*"
        element={
          <ProtectedRoute>
            <Layout>
              <CompanyScopedPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route 
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pedidos"
        element={
          <ProtectedRoute>
            <Layout>
              <Pedidos />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/equipamentos"
        element={
          <ProtectedRoute>
            <Layout>
              <Equipamentos />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/equipamentos/alocacao/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EquipamentoAlocacao />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ordem-servico"
        element={
          <ProtectedRoute>
            <Layout>
              <OrdemServico />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agenda"
        element={
          <ProtectedRoute>
            <Layout>
              <Agenda />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tecnicos"
        element={
          <ProtectedRoute>
            <Layout>
              <Tecnicos />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/validacao"
        element={
          <ProtectedRoute>
            <Layout>
              <Validacao />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/certificados"
        element={
          <ProtectedRoute>
            <Layout>
              <Certificados />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/relatorios"
        element={
          <ProtectedRoute>
            <Layout>
              <Relatorios />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/configuracoes"
        element={
          <ProtectedRoute roles={['administrador']}>
            <Layout>
              <Configuracoes />
            </Layout>
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <>
      <Helmet>
        <title>SIGas - Sistema de Inspeção de Gás</title>
        <meta name="description" content="Sistema completo para gestão de inspeções técnicas de gás residencial e comercial" />
      </Helmet>
      <Router>
        <SettingsProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
        </SettingsProvider>
      </Router>
    </>
  );
}

export default App;
