import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { StudentShell } from './components/StudentShell';
import { LoadingBlock } from './components/Layout';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChargesPage } from './pages/ChargesPage';
import { BatchesPage } from './pages/BatchesPage';
import { FundPage } from './pages/FundPage';
import { ScholarshipsPage } from './pages/ScholarshipsPage';
import { GovernancePage } from './pages/GovernancePage';
import { LedgerPage } from './pages/LedgerPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { NewStudentPage } from './pages/NewStudentPage';
import { ImportStudentsPage } from './pages/ImportStudentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UnitsPage } from './pages/UnitsPage';
import { NewUnitPage } from './pages/NewUnitPage';
import { UnitDetailPage } from './pages/UnitDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { PortalHomePage } from './pages/portal/PortalHomePage';
import { PortalInvoicesPage } from './pages/portal/PortalInvoicesPage';
import { PortalDocumentsPage } from './pages/portal/PortalDocumentsPage';
import { PortalWalletPage } from './pages/portal/PortalWalletPage';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingBlock label="Carregando sessão" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.role === 'STUDENT') {
    return (
      <StudentShell>
        <Routes>
          <Route path="/portal" element={<PortalHomePage />} />
          <Route path="/portal/faturas" element={<PortalInvoicesPage />} />
          <Route path="/portal/documentos" element={<PortalDocumentsPage />} />
          <Route path="/portal/carteira" element={<PortalWalletPage />} />
          <Route path="/login" element={<Navigate to="/portal" replace />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </StudentShell>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cobrancas" element={<ChargesPage />} />
        <Route path="/lotes" element={<BatchesPage />} />
        <Route path="/fundo" element={<FundPage />} />
        <Route path="/bolsas" element={<ScholarshipsPage />} />
        <Route path="/governanca" element={<GovernancePage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/alunos" element={<StudentsPage />} />
        <Route path="/alunos/novo" element={<NewStudentPage />} />
        <Route path="/alunos/importar" element={<ImportStudentsPage />} />
        <Route path="/alunos/:id" element={<StudentDetailPage />} />
        <Route path="/unidades" element={<UnitsPage />} />
        <Route path="/unidades/nova" element={<NewUnitPage />} />
        <Route path="/unidades/:id" element={<UnitDetailPage />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/configuracoes/usuarios" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
