import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to SkipQ Mobile</Text>
      <Link href="/(app)/home" style={styles.link}>
        <Text style={styles.linkText}>Go to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  text: { color: '#fff', fontSize: 24, marginBottom: 20 },
  link: { padding: 10, backgroundColor: '#2563eb', borderRadius: 8 },
  linkText: { color: '#fff', fontSize: 18 }
});
