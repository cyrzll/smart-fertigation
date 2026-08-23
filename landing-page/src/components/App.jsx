import React from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { MeetMelo } from './MeetMelo';
import { VisiMisi } from './VisiMisi';
import { TechnologySection } from './TechnologySection';
import { ProductKatalogSection } from './ProductKatalogSection';
import { SdgSection } from './SdgSection';
import { FarmerSidoMaju } from './FarmerSidoMaju';
import { Footer } from './Footer';

export const App = () => {
  return (
    <div className="min-h-screen bg-[#FAF7EE] text-[#16381E] selection:bg-[#4B7F38] selection:text-[#FAF7EE]">
      <Navbar />
      <main>
        <Hero />
        <MeetMelo />
        <VisiMisi />
        <TechnologySection />
        <ProductKatalogSection />
        <SdgSection />
        <FarmerSidoMaju />
      </main>
      <Footer />
    </div>
  );
};
