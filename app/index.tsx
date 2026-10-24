// Owner: AB. Entry gate. AB replaces with: not onboarded -> /onboarding, no fellowship -> /onboarding, else tabs.
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/coloring" />;
}
