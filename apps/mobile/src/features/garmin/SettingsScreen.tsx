import { useState } from 'react';
import { Button, Card, Field, Screen, Txt } from '@/shared/ui/kit';
import { forgetBffToken, saveBffToken, useGarminImport } from './bffAccess.client';

/** Settings: the BFF access token that proves to the BFF this phone is the owner's. */
export function SettingsScreen() {
  const { bffUrl, token } = useGarminImport();
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState(false);

  const save = () => {
    try {
      saveBffToken(draft.trim());
      setDraft('');
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <Screen testID="settings">
      <Card>
        <Txt v="h2">Import Garmin</Txt>
        <Txt testID="settings-bff-url" v="muted">
          {bffUrl ? `BFF : ${bffUrl}` : 'Cette version de l’app n’est reliée à aucun BFF : l’import Garmin est indisponible.'}
        </Txt>
        <Txt testID="settings-token-status">{token ? 'Jeton enregistré.' : 'Aucun jeton enregistré.'}</Txt>
        <Field
          testID="settings-token"
          label="Jeton d’accès du BFF"
          value={draft}
          onChangeText={setDraft}
          placeholder={token ? 'Remplacer le jeton' : 'Coller le jeton'}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          error={failed && 'Le jeton n’a pas pu être enregistré sur ce téléphone.'}
        />
        <Button testID="settings-token-save" title="Enregistrer le jeton" variant="primary" disabled={!draft.trim()} onPress={save} />
        {token && <Button testID="settings-token-forget" title="Supprimer le jeton" variant="danger" onPress={() => forgetBffToken()} />}
      </Card>
    </Screen>
  );
}
