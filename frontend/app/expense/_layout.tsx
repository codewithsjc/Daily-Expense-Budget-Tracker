import { Stack } from 'expo-router';

export default function ExpenseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
