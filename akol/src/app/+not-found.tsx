import { Redirect } from 'expo-router';

/** Unknown links (and web hosts that serve the app under another path) land on Today. */
export default function NotFound() {
  return <Redirect href="/" />;
}
