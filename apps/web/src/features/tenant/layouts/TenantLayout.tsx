import React from 'react';
import { Outlet } from 'react-router-dom';
import TenantHeader from '../components/TenantHeader';

/**
 * TenantLayout — wraps all /tenant/* routes with a shared header.
 * Uses <Outlet /> from react-router to render child routes.
 */
const TenantLayout: React.FC = React.memo(() => {
    return (
        <div className="min-h-screen flex flex-col">
            <TenantHeader />
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
});

TenantLayout.displayName = 'TenantLayout';
export default TenantLayout;
