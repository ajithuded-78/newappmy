import { useState } from 'react';
import { hashPin, setPin, verifyPin, isPinSet } from '@/utils/storage';
import { ShieldCheck, Lock } from 'lucide-react';

interface LoginProps {
  onAuthenticated: () => void;
}

export default function Login({ onAuthenticated }: LoginProps) {
  const [pin, setLocalPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<'enter' | 'setup' | 'confirm'>(isPinSet() ? 'enter' : 'setup');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDigit = (d: string) => {
    setError('');
    if (mode === 'enter' && pin.length < 4) {
      const next = pin + d;
      setLocalPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (verifyPin(next)) {
            onAuthenticated();
          } else {
            setError('Incorrect PIN');
            setLocalPin('');
            triggerShake();
          }
        }, 150);
      }
    } else if (mode === 'setup' && pin.length < 4) {
      const next = pin + d;
      setLocalPin(next);
      if (next.length === 4) setTimeout(() => setMode('confirm'), 150);
    } else if (mode === 'confirm' && confirmPin.length < 4) {
      const next = confirmPin + d;
      setConfirmPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (next === pin) {
            setPin(pin);
            onAuthenticated();
          } else {
            setError('PINs do not match. Try again.');
            setLocalPin('');
            setConfirmPin('');
            setMode('setup');
            triggerShake();
          }
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setError('');
    if (mode === 'confirm') setConfirmPin(p => p.slice(0, -1));
    else setLocalPin(p => p.slice(0, -1));
  };

  const activePin = mode === 'confirm' ? confirmPin : pin;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--cyan)) 0%, hsl(200 80% 40%) 100%)' }}>
          <ShieldCheck className="w-8 h-8" style={{ color: 'hsl(var(--primary-foreground))' }} />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>LSRIS</h1>
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Local Sales & Revenue Intelligence</p>
        </div>
      </div>

      {/* Card */}
      <div className="stat-card w-full max-w-[320px] flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <Lock className="w-5 h-5 mx-auto mb-2" style={{ color: 'hsl(var(--cyan))' }} />
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            {mode === 'enter' ? 'Enter PIN' : mode === 'setup' ? 'Set a 4-digit PIN' : 'Confirm PIN'}
          </p>
          {error && (
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
          )}
        </div>

        {/* Dots */}
        <div className={`flex gap-3 ${shake ? 'animate-bounce' : ''}`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`pin-dot ${i < activePin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => {
            if (key === '') return <div key={idx} />;
            return (
              <button
                key={idx}
                className="pin-button"
                onClick={() => key === '⌫' ? handleBackspace() : handleDigit(key)}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Private Owner System — Unauthorized access prohibited
      </p>
    </div>
  );
}
