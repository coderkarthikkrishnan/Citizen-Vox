import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Map, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../firebase/config';
import './Layout.css';

const AdminLayout = () => {
  const roleBadge = "Admin";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && (!user || user.role === 'citizen')) {
      navigate('/citizen');
    }
  }, [user, loading, navigate]);
  
  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
      navigate('/login');
    }
  };
  
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
    { icon: <FileText size={20} />, label: 'Issues', path: '/admin/issues' },
    { icon: <LayoutDashboard size={20} />, label: 'Priority Queue', path: '/admin/priority' },
    { icon: <Map size={20} />, label: 'Map', path: '/admin/map' },
    { icon: <Users size={20} />, label: 'Workers', path: '/admin/workers' },
    { icon: <FileText size={20} />, label: 'Departments', path: '/admin/departments' },
    { icon: <LayoutDashboard size={20} />, label: 'Civic Memory', path: '/admin/civic-memory' },
    { icon: <LayoutDashboard size={20} />, label: 'Civic Copilot', path: '/admin/copilot' }
  ];

  if (loading) return <div>Loading...</div>;
  if (!user || user.role === 'citizen') return null;

  return (
    <div className="app-layout admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-brand">
            <div className="logo-mark"></div>
            <span className="logo-text">Citizen Vox</span>
          </div>
          <span className="role-badge">{roleBadge}</span>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item, idx) => (
            <Link 
              key={idx} 
              to={item.path}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <button className="sidebar-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <div className="header-search">
            {/* Search Placeholder */}
          </div>
          <div className="header-user">
            <div className="user-info">
              <span className="user-name">{user.displayName || user.name || 'User'}</span>
              <span className="user-role">{user.role?.replace('_', ' ').toUpperCase()} {user.department ? `- ${user.department}` : ''}</span>
            </div>
            <div className="avatar-placeholder">{user.displayName?.[0]?.toUpperCase() || 'U'}</div>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
