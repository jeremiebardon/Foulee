import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Field, Row, Txt } from '@/shared/ui/kit';
import { color, space } from '@/shared/ui/theme';
import { AuthError, isEmail, type AuthErrorCode, type OtpChallenge } from './auth';
import { useAuth } from './AuthProvider';

const ERRORS: Record<AuthErrorCode, string> = {
  invalid_email: 'Cette adresse ne ressemble pas à un email.',
  invalid_code: 'Code incorrect. Vérifier les 6 chiffres.',
  expired: 'Ce code a expiré. Demander un nouveau code.',
  too_many_attempts: 'Trop d’essais. Demander un nouveau code.',
};
const message = (e: unknown) => (e instanceof AuthError ? ERRORS[e.code] : 'Connexion impossible. Réessayer dans un instant.');

export function LoginScreen() {
  const { gateway, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  /** Runs an auth call with busy and error state. */
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await task();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const requestCode = () => run(async () => { setChallenge(await gateway.requestCode(email)); setCode(''); });
  const verify = (value: string) => run(async () => signIn(await gateway.verifyCode(email, value)));

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.hero}>
        <Txt style={s.tagline}>Un plan.{'\n'}Des séances.{'\n'}Un calendrier.</Txt>
      </View>
      <View style={s.form}>
        <Txt v="h1">Foulée</Txt>
        {!challenge ? (
          <>
            <Txt v="muted">Pas de mot de passe : un code à 6 chiffres est envoyé par email.</Txt>
            <Field label="Adresse email" value={email} onChangeText={setEmail} placeholder="prenom@exemple.com"
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" onSubmitEditing={requestCode} error={error} />
            <Button title={busy ? 'Envoi…' : 'Recevoir mon code'} variant="primary" disabled={busy || !isEmail(email)} onPress={requestCode} />
          </>
        ) : (
          <>
            <Txt v="muted">Code envoyé à {email.trim()}, valable 5 minutes.</Txt>
            {challenge.demoCode && (
              <View style={s.demo}>
                <Txt v="label">Mode démo : aucun email n’est envoyé</Txt>
                <Txt>Code : <Txt style={{ fontWeight: '800', letterSpacing: 3 }}>{challenge.demoCode}</Txt></Txt>
              </View>
            )}
            <Field label="Code à 6 chiffres" value={code} maxLength={6} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" error={error}
              onChangeText={(t) => {
                const digits = t.replace(/\D/g, '');
                setCode(digits);
                if (digits.length === 6) verify(digits);
              }} />
            <Row>
              <Button title="Renvoyer un code" variant="ghost" disabled={busy} onPress={requestCode} />
              <Button title="Changer d’adresse" variant="ghost" onPress={() => { setChallenge(null); setError(undefined); }} />
            </Row>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.surface },
  hero: { backgroundColor: color.accent, paddingHorizontal: space.xl, paddingTop: 72, paddingBottom: space.xl },
  tagline: { color: '#fff', fontSize: 34, lineHeight: 36, fontWeight: '900', textTransform: 'uppercase' },
  form: { padding: space.xl, gap: space.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  demo: { padding: space.md, gap: 4, borderRadius: 10, borderLeftWidth: 5, borderWidth: 1, borderColor: color.lane, backgroundColor: '#fff6d8' },
});
