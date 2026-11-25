import AboutPage from '@/components/AboutPage';
import { Brand } from '@/components/SignIn';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '@/components/about.css';

export default function About() {
  return <div className="about-shell"><header><Brand/><Link to="/dashboard"><ArrowLeft size={15}/> Back to EDVORA</Link></header><AboutPage/><footer>© 2026 EDVORA · A learning space built with care</footer></div>;
}
