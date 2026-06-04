import { Redirect } from 'expo-router';

export default function Index() {
  // Inicialmente redirige a login
  return <Redirect href="/login" />;
}
