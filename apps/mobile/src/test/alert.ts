import { act } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

/**
 * The native dialog does not exist under Jest. Spying on it records what the user is asked;
 * `answerAlert` stands in for the user pressing one of its buttons.
 */
export const watchAlerts = () => jest.spyOn(Alert, 'alert').mockImplementation(() => {});

export function lastAlert() {
  const [title, message, buttons = []] = jest.mocked(Alert.alert).mock.calls.at(-1) ?? [];
  return { title, message, buttons: (buttons as AlertButton[]).map((b) => b.text) };
}

export async function answerAlert(text: string) {
  const buttons = (jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  const button = buttons.find((b) => b.text === text);
  if (!button) throw new Error(`The last alert has no « ${text} » button.`);
  await act(async () => button.onPress?.());
}
