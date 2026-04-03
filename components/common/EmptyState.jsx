import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  return (
    <View style={s.container}>
      {Icon && (
        <View style={s.iconWrap}>
          <Icon size={32} color={Colors.textTertiary} />
        </View>
      )}
      <Text style={s.title}>{title}</Text>
      {message ? <Text style={s.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={s.btn} onPress={onAction} activeOpacity={0.8}>
          <Text style={s.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: C.textPrimary, textAlign: 'center' },
  message: { fontSize: 14, color: C.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  btn: {
    marginTop: 20, backgroundColor: C.textPrimary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  btnText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: C.onPrimary },
});
