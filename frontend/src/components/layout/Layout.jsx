import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Antigravity from '../particles/Antigravity';

export default function Layout() {
  return (
    <div className="page-layout">
      <Antigravity
        count={280}
      />
      <Navbar />
      <main className="page-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
