import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { LoginInput } from "@courtpot/schemas";
import { Button, Input, screenClass } from "@courtpot/ui";
import { useAuth } from "../lib/auth";
import { firstIssueMessage } from "../lib/forms";
import { FormError } from "./FormError";

export function LoginScreen(): ReactElement {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLogin = async (): Promise<void> => {
    const parsed = LoginInput.safeParse({ username, pin });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }
    setBusy(true);
    setError(await login(parsed.data));
    setBusy(false);
  };

  return (
    <View className={`${screenClass} justify-center gap-4 p-6`}>
      <Text className="text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100">CourtPot</Text>
      <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
        Sign in with your username and 4-digit PIN
      </Text>
      <Input label="Username" value={username} onChangeText={setUsername} placeholder="e.g. robinn" />
      <Input label="PIN" value={pin} onChangeText={setPin} placeholder="4 digits" keyboardType="number-pad" />
      <FormError message={error} />
      <Button label={busy ? "Signing in…" : "Sign in"} onPress={() => void handleLogin()} disabled={busy} />
    </View>
  );
}
