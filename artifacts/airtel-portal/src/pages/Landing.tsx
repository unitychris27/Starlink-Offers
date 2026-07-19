import React from 'react';
import { useLocation } from 'wouter';
import { Signal, ShieldCheck, Zap, HeadphonesIcon } from 'lucide-react';
import airtelLogo from '@assets/image_1784479304453.png';

const packages = [
  { id: '1gb-1d', tech: '4G', data: '1 GB', validity: 'Valide 1 Jour', price: '$0.19', label: null },
  { id: '3gb-3d', tech: '4G', data: '3 GB', validity: 'Valide 3 Jours', price: '$0.39', label: null },
  { id: '7gb-7d', tech: '4G', data: '7 GB', validity: 'Valide 7 Jours', price: '$0.79', label: null },
  { id: '15gb-7d', tech: '4G', data: '15 GB', validity: 'Valide 7 Jours', price: '$1.49', label: '⚡ Populaire' },
  { id: '30gb-21d', tech: '4G+', data: '30 GB', validity: 'Valide 21 Jours', price: '$2.99', label: '💎 Pro' },
  { id: '50gb-30d', tech: '4G+', data: '50 GB', validity: 'Valide 30 Jours', price: '$5.49', label: '🚀 Max' },
  { id: 'unlimited-30d', tech: '4G+', data: '∞', validity: 'Valide 30 Jours', price: '$7.49', label: '👑 Illimité' },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleSelectPackage = (pkg: typeof packages[0]) => {
    // Navigate to login, storing selected package in state
    setLocation('/login', { state: { selectedPackage: pkg } });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b bg-white shadow-sm h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between max-w-5xl">
          <img src={airtelLogo} alt="Airtel Logo" className="h-8 w-auto object-contain" data-testid="img-logo-header" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" data-testid="text-partner">
            En collaboration avec STARLINK™
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16 px-4 text-center relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-[50%] -left-[10%] w-[60%] h-[200%] bg-white transform rotate-12" />
        </div>
        
        <div className="relative z-10 container mx-auto max-w-3xl flex flex-col items-center">
          <div className="bg-white/20 p-4 rounded-full mb-6 backdrop-blur-sm border border-white/30">
            <Signal className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-md" data-testid="text-hero-title">
            Forfaits Internet
          </h1>
          <p className="text-xl md:text-2xl font-semibold mb-3 drop-shadow" data-testid="text-hero-tagline">
            Restez Connecté Sans Limites
          </p>
          <p className="text-primary-foreground/90 text-sm md:text-base max-w-lg mx-auto font-medium" data-testid="text-hero-subtitle">
            Choisissez un forfait. Vous serez redirigé vers la page de connexion Airtel Lite pour procéder au paiement.
          </p>
        </div>
      </section>

      {/* Packages Grid */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {packages.map((pkg, idx) => {
            const isPopular = pkg.label === '⚡ Populaire';
            
            return (
              <div 
                key={pkg.id}
                className={`relative flex flex-col bg-card rounded-2xl shadow-sm border ${
                  isPopular ? 'border-primary shadow-primary/20 shadow-md ring-1 ring-primary' : 'border-card-border hover:shadow-md'
                } transition-all duration-200 overflow-hidden group`}
                data-testid={`card-package-${pkg.id}`}
              >
                {/* Highlight Badge */}
                {pkg.label && (
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-lg font-bold text-xs whitespace-nowrap z-10 ${
                    isPopular ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {pkg.label}
                  </div>
                )}

                <div className={`p-6 flex-1 flex flex-col ${pkg.label ? 'pt-8' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-muted text-muted-foreground border border-border">
                      {pkg.tech}
                    </span>
                    <span className="text-2xl font-black text-foreground">{pkg.price}</span>
                  </div>
                  
                  <div className="mb-2">
                    <h3 className="text-4xl font-black tracking-tight text-primary">
                      {pkg.data}
                    </h3>
                  </div>
                  
                  <div className="text-sm font-medium text-muted-foreground mb-6">
                    {pkg.validity}
                  </div>

                  <div className="mt-auto">
                    <button 
                      onClick={() => handleSelectPackage(pkg)}
                      className={`w-full py-3 px-4 rounded-xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                        isPopular 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                      data-testid={`button-select-${pkg.id}`}
                    >
                      Choisir ce forfait
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Trust Footer Strip */}
      <div className="bg-secondary/50 border-y border-border py-6 mt-12">
        <div className="container mx-auto px-4 max-w-5xl flex flex-wrap items-center justify-center gap-8 md:gap-16 text-sm font-semibold text-secondary-foreground/80">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span>Activation instantanée</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Paiement sécurisé</span>
          </div>
          <div className="flex items-center gap-2">
            <HeadphonesIcon className="w-5 h-5 text-primary" />
            <span>Support 24/7</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center bg-white">
        <p className="text-sm font-medium text-muted-foreground" data-testid="text-footer-copyright">
          © 2026 Airtel Congo. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
