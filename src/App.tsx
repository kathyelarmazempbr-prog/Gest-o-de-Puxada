import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DeveloperDashboard } from './pages/DeveloperDashboard.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { DriverDashboard } from './pages/DriverDashboard.tsx';
import { DriverTripsPage } from './pages/DriverTripsPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';
import { DriversPage } from './pages/DriversPage.tsx';
import { VehiclesPage } from './pages/VehiclesPage.tsx';
import { FactoriesPage } from './pages/FactoriesPage.tsx';
import { TripsPage } from './pages/TripsPage.tsx';
import { SchedulesPage } from './pages/SchedulesPage.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { IndicatorsPage } from './pages/IndicatorsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { DriverProfilePage } from './pages/DriverProfilePage.tsx';
import { DriverPerformancePage } from './pages/DriverPerformancePage.tsx';
import { DriverMealsPage } from './pages/DriverMealsPage.tsx';

// Modals
import { TripDetailsModal } from './components/modals/TripDetailsModal.tsx';
import { NewTripModal } from './components/modals/NewTripModal.tsx';
import { SystemTestsModal } from './components/modals/SystemTestsModal.tsx';
import { NewUserModal } from './components/modals/NewUserModal.tsx';
import { NewDriverModal } from './components/modals/NewDriverModal.tsx';
import { NewVehicleModal } from './components/modals/NewVehicleModal.tsx';
import { NewFactoryModal } from './components/modals/NewFactoryModal.tsx';
import { NewScheduleModal } from './components/modals/NewScheduleModal.tsx';

import { Trip } from './types/index.ts';

function MainApp() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals state
  const [selectedTripDetails, setSelectedTripDetails] = useState<Trip | null>(null);
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [showTestsModal, setShowTestsModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [userModalInitialRole, setUserModalInitialRole] = useState<'DESENVOLVEDOR' | 'ADMINISTRADOR' | 'MOTORISTA'>('ADMINISTRADOR');
  const [showNewDriverModal, setShowNewDriverModal] = useState(false);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [showNewFactoryModal, setShowNewFactoryModal] = useState(false);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);

  // Refresh key to force reload when records update
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
  };

  // Automatic redirect based on profile (Section 4)
  useEffect(() => {
    if (role === 'MOTORISTA') {
      setCurrentView('driver-home');
    } else if (role === 'ADMINISTRADOR' || role === 'DESENVOLVEDOR') {
      setCurrentView('dashboard');
    }
  }, [role]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#081028]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-400">Iniciando Gestão de Puxada...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onSuccess={(loggedRole) => {
          if (loggedRole === 'MOTORISTA') {
            setCurrentView('driver-home');
          } else {
            setCurrentView('dashboard');
          }
        }} 
      />
    );
  }

  const renderContent = () => {
    switch (currentView) {
      // Dashboards
      case 'dashboard':
        if (role === 'DESENVOLVEDOR') {
          return <DeveloperDashboard key={refreshTrigger} onNavigate={setCurrentView} />;
        }
        if (role === 'ADMINISTRADOR') {
          return (
            <AdminDashboard
              key={refreshTrigger}
              onOpenNewTripModal={() => setShowNewTripModal(true)}
              onOpenTripDetails={setSelectedTripDetails}
            />
          );
        }
        return (
          <DriverDashboard 
            key={refreshTrigger} 
            onOpenTripDetails={setSelectedTripDetails} 
            onNavigateToTrips={() => setCurrentView('my-trips')} 
          />
        );

      // Driver specific views
      case 'driver-home':
        return (
          <DriverDashboard 
            key={refreshTrigger} 
            onOpenTripDetails={setSelectedTripDetails} 
            onNavigateToTrips={() => setCurrentView('my-trips')} 
          />
        );

      case 'my-trips':
        return (
          <DriverTripsPage 
            key={refreshTrigger} 
            onOpenTripDetails={setSelectedTripDetails} 
          />
        );

      case 'driver-performance':
        return (
          <DriverPerformancePage
            key={refreshTrigger}
            onOpenTripDetails={setSelectedTripDetails}
          />
        );

      case 'driver-meals':
        return (
          <DriverMealsPage
            key={refreshTrigger}
            onOpenTripDetails={setSelectedTripDetails}
          />
        );

      case 'my-schedule':
        return <SchedulesPage key={refreshTrigger} onOpenNewScheduleModal={() => {}} canManage={false} />;

      case 'my-profile':
        return <DriverProfilePage key={refreshTrigger} />;

      // Operational views (Centralizada e Unificada: Viagens e Histórico)
      case 'trips':
      case 'history':
        return (
          <TripsPage
            key={refreshTrigger}
            onOpenNewTripModal={() => setShowNewTripModal(true)}
            onOpenTripDetails={setSelectedTripDetails}
          />
        );

      case 'drivers':
        return (
          <UsersPage
            key={refreshTrigger}
            onOpenNewUserModal={() => {
              setUserModalInitialRole('MOTORISTA');
              setShowNewUserModal(true);
            }}
          />
        );

      case 'vehicles':
        return (
          <VehiclesPage
            key={refreshTrigger}
            onOpenNewVehicleModal={() => setShowNewVehicleModal(true)}
            onOpenTripDetails={setSelectedTripDetails}
          />
        );

      case 'factories':
        return (
          <FactoriesPage
            key={refreshTrigger}
            onOpenNewFactoryModal={() => setShowNewFactoryModal(true)}
          />
        );

      case 'schedules':
        return (
          <SchedulesPage
            key={refreshTrigger}
            onOpenNewScheduleModal={() => setShowNewScheduleModal(true)}
            onOpenNewTripModal={() => setShowNewTripModal(true)}
            onOpenTripDetails={setSelectedTripDetails}
            canManage={role !== 'MOTORISTA'}
          />
        );

      case 'calendar':
        return (
          <CalendarPage
            key={refreshTrigger}
            onOpenTripDetails={setSelectedTripDetails}
            onOpenNewTripModal={() => setShowNewTripModal(true)}
            canManage={role !== 'MOTORISTA'}
          />
        );

      // Exclusive Developer views
      case 'users':
        return (
          <UsersPage
            key={refreshTrigger}
            onOpenNewUserModal={() => setShowNewUserModal(true)}
          />
        );

      case 'settings':
        return <SettingsPage key={refreshTrigger} />;

      case 'indicators':
        return <IndicatorsPage key={refreshTrigger} />;

      default:
        return (
          <AdminDashboard
            key={refreshTrigger}
            onOpenNewTripModal={() => setShowNewTripModal(true)}
            onOpenTripDetails={setSelectedTripDetails}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#081028] font-sans text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden bg-[#081028]">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenTestsModal={() => setShowTestsModal(true)}
          currentView={currentView}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#081028] p-3 sm:p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        onSelectView={setCurrentView}
        onToggleMenu={() => setSidebarOpen(true)}
      />

      {/* Modals */}
      <TripDetailsModal
        trip={selectedTripDetails}
        onClose={() => setSelectedTripDetails(null)}
        canManage={role === 'ADMINISTRADOR' || role === 'DESENVOLVEDOR'}
      />

      <NewTripModal
        isOpen={showNewTripModal}
        onClose={() => setShowNewTripModal(false)}
        onSuccess={triggerRefresh}
      />

      <SystemTestsModal
        isOpen={showTestsModal}
        onClose={() => {
          setShowTestsModal(false);
          triggerRefresh();
        }}
      />

      <NewUserModal
        isOpen={showNewUserModal}
        initialRole={userModalInitialRole}
        onClose={() => setShowNewUserModal(false)}
        onSuccess={triggerRefresh}
      />

      <NewDriverModal
        isOpen={showNewDriverModal}
        onClose={() => setShowNewDriverModal(false)}
        onSuccess={triggerRefresh}
      />

      <NewVehicleModal
        isOpen={showNewVehicleModal}
        onClose={() => setShowNewVehicleModal(false)}
        onSuccess={triggerRefresh}
      />

      <NewFactoryModal
        isOpen={showNewFactoryModal}
        onClose={() => setShowNewFactoryModal(false)}
        onSuccess={triggerRefresh}
      />

      <NewScheduleModal
        isOpen={showNewScheduleModal}
        onClose={() => setShowNewScheduleModal(false)}
        onSuccess={triggerRefresh}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
