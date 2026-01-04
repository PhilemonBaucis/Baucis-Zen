import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PromoBanner from '@/components/ui/PromoBanner';
import StoreWrapper from '@/components/layout/StoreWrapper';
import ZenPointsDevTool from '@/components/dev/ZenPointsDevTool';

export default function StoreLayout({ children }) {
  return (
    <StoreWrapper>
      <Header />
      <PromoBanner />
      <div className="min-h-screen">
        {children}
      </div>
      <Footer />
      <ZenPointsDevTool />
    </StoreWrapper>
  );
}

