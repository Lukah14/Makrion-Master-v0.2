import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Catches synchronous render errors during boot so the app can show a message instead of a red screen.
 * Firestore/Auth async errors are logged separately in services — this is for React tree failures only.
 */
export default class BootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[BOOT] BootErrorBoundary caught', error?.message || error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View style={styles.box} accessibilityRole="alert">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.msg}>{String(error?.message || error)}</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
            accessibilityRole="button"
          >
            <Text style={styles.btnTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f0f12',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  msg: { fontSize: 14, color: '#ccc', textAlign: 'center', marginBottom: 20 },
  btn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#3b82f6', borderRadius: 10 },
  btnTxt: { color: '#fff', fontWeight: '600' },
});
