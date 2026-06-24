import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ParticleCanvas from '../particles/ParticleCanvas';

export default function Layout() {
  return (
    <div className="page-layout">
      <ParticleCanvas
        particleCount={600}
        connectionDistance={80}
        showConnections={true}
      />
      <Navbar />
      <main className="page-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
