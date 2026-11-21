import { render, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { useState } from 'react';
import { answerAlert, lastAlert, watchAlerts } from '@/test/alert';
import { formatDistance, parseDistance } from '@/shared/lib/format';
import { Button, Card, Chips, confirm, Empty, Field, ListStack, ParsedField, Row, Screen, Sheet, Stepper, Txt } from './kit';

// The UI kit is exercised through what its users see and do; callbacks are its outputs.

describe('Button', () => {
  it('is named by its title, or by its label when it has one', async () => {
    await render(
      <Row>
        <Button title="Enregistrer" onPress={jest.fn()} />
        <Button title="Auj." label="Aujourd’hui" variant="primary" onPress={jest.fn()} />
        <Button icon="close" label="Fermer" variant="ghost" onPress={jest.fn()} />
        <Button title="Supprimer" icon="trash-outline" variant="danger" onPress={jest.fn()} />
      </Row>,
    );
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Aujourd’hui' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeOnTheScreen();
  });

  it('runs its action when pressed, unless disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    const { rerender } = await render(<Button title="Valider" onPress={onPress} />);
    await user.press(screen.getByRole('button', { name: 'Valider' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<Button title="Valider" disabled onPress={onPress} />);
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Valider' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Field', () => {
  it('labels its input and shows an error under it', async () => {
    await render(<Field label="Nom" value="" error="Obligatoire" />);
    expect(screen.getByLabelText('Nom')).toBeOnTheScreen();
    expect(screen.getByText('Obligatoire')).toBeOnTheScreen();
  });

  it('shows no error when there is none', async () => {
    await render(<Field label="Nom" value="" error={false} />);
    expect(screen.queryByText('Obligatoire')).not.toBeOnTheScreen();
  });
});

describe('ParsedField', () => {
  /** A distance field and the value it reports, as a form would hold it. */
  function DistanceForm({ initial }: { initial?: number }) {
    const [meters, setMeters] = useState(initial);
    return (
      <Screen>
        <ParsedField label="Distance" value={meters} format={formatDistance} parse={parseDistance} invalidText="Ex. : 400 m" onChange={setMeters} />
        <Txt v="muted">Valeur : {meters ?? 'aucune'}</Txt>
      </Screen>
    );
  }

  it('reports what it can read, and tidies it up once left', async () => {
    const user = userEvent.setup();
    await render(<DistanceForm />);
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('');
    await user.type(screen.getByLabelText('Distance'), '2,5');
    expect(screen.getByText('Valeur : 2500')).toBeOnTheScreen();
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('2,5 km');
  });

  it('flags text it cannot read and keeps the last good value', async () => {
    const user = userEvent.setup();
    await render(<DistanceForm initial={400} />);
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('400 m');
    await user.paste(screen.getByLabelText('Distance'), 'loin');
    expect(screen.getByText('Ex. : 400 m')).toBeOnTheScreen();
    expect(screen.getByText('Valeur : 400')).toBeOnTheScreen();
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('loin');
  });

  it('reports no value once emptied', async () => {
    const user = userEvent.setup();
    await render(<DistanceForm initial={400} />);
    await user.clear(screen.getByLabelText('Distance'));
    expect(screen.getByText('Valeur : aucune')).toBeOnTheScreen();
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('');
  });
});

describe('Chips', () => {
  it('marks the chosen option and reports another one pressed', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<Chips options={{ distance: 'Distance', time: 'Durée' }} value="distance" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Distance' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Durée' })).not.toBeSelected();
    await user.press(screen.getByRole('radio', { name: 'Durée' }));
    expect(onChange).toHaveBeenCalledWith('time');
  });
});

describe('Stepper', () => {
  it('steps the value up and down', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<Stepper label="Répétitions" value={4} onChange={onChange} />);
    expect(screen.getByText('4')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Répétitions : plus' }));
    expect(onChange).toHaveBeenLastCalledWith(5);
    await user.press(screen.getByRole('button', { name: 'Répétitions : moins' }));
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('stops at its bounds, and formats its value', async () => {
    await render(<Stepper label="Semaines" value={2} min={2} max={2} format={(w) => `${w} sem.`} onChange={jest.fn()} />);
    expect(screen.getByText('2 sem.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Semaines : moins' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Semaines : plus' })).toBeDisabled();
  });
});

describe('Sheet', () => {
  const renderSheet = (visible: boolean, onClose = jest.fn()) =>
    render(
      <Sheet visible={visible} title="Mardi · semaine 1" onClose={onClose}>
        <Txt>Choisir un entraînement</Txt>
      </Sheet>,
    );

  it('shows its title and content while open', async () => {
    await renderSheet(true);
    expect(screen.getByText('Mardi · semaine 1')).toBeOnTheScreen();
    expect(screen.getByText('Choisir un entraînement')).toBeOnTheScreen();
  });

  it('shows nothing while closed', async () => {
    await renderSheet(false);
    expect(screen.queryByText('Choisir un entraînement')).not.toBeOnTheScreen();
  });

  it('asks to close from its button or by tapping outside', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await renderSheet(true, onClose);
    await user.press(screen.getByRole('button', { name: 'Fermer' }));
    // The backdrop carries the same label, without being a button.
    const [backdrop] = screen.getAllByLabelText('Fermer');
    await user.press(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Empty', () => {
  it('explains an empty state and offers its action', async () => {
    await render(
      <Card>
        <Empty title="Aucun plan" text="Créer un plan pour commencer." action={<Button title="Créer un plan" onPress={jest.fn()} />} />
      </Card>,
    );
    expect(screen.getByText('Aucun plan')).toBeOnTheScreen();
    expect(screen.getByText('Créer un plan pour commencer.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Créer un plan' })).toBeOnTheScreen();
  });
});

describe('confirm', () => {
  beforeEach(() => watchAlerts());

  it('asks before a destructive action, which runs only once confirmed', async () => {
    const onConfirm = jest.fn();
    confirm('Supprimer ce plan ?', 'Ses séances seront supprimées.', 'Supprimer', onConfirm);
    expect(lastAlert()).toEqual({ title: 'Supprimer ce plan ?', message: 'Ses séances seront supprimées.', buttons: ['Annuler', 'Supprimer'] });
    await answerAlert('Annuler');
    expect(onConfirm).not.toHaveBeenCalled();
    await answerAlert('Supprimer');
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('ListStack', () => {
  it('hosts a tab’s list screen', async () => {
    await renderRouter(
      { 'plans/_layout': () => <ListStack title="Plans" />, 'plans/index': () => <Txt>Liste des plans</Txt> },
      { initialUrl: '/plans' },
    );
    expect(screen.getByText('Liste des plans')).toBeOnTheScreen();
  });
});
