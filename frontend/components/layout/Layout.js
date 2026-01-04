import Header from './Header';
import MousePowderEffect from '../ui/MousePowderEffect';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <MousePowderEffect />
      <Header />
      <main className="flex-grow relative z-10">
        {children}
      </main>
    </div>
  );
}
