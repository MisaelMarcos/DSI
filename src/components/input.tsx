import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

type InputProps = TextInputProps & {
  // Quando true, a borda fica vermelha (ex.: erro de validação).
  error?: boolean;
};

export function Input({ error, style, ...rest }: InputProps) {
  return (
    <TextInput
      style={[styles.input, error && styles.error, style]}
      placeholderTextColor="#94A3B8"
      {...rest}
    />
  );
}

/** Campo de senha com botão de olho para mostrar/ocultar o texto digitado. */
export function InputSenha({
  style,
  ...rest
}: Omit<InputProps, "secureTextEntry">) {
  const [mostrar, setMostrar] = useState(false);
  const desabilitado = rest.editable === false;

  return (
    <View style={styles.senhaContainer}>
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
        secureTextEntry={!mostrar}
        style={[styles.senhaInput, style]}
      />

      <Pressable
        style={styles.olho}
        onPress={() => setMostrar((atual) => !atual)}
        disabled={desabilitado}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={mostrar ? "Ocultar senha" : "Mostrar senha"}
      >
        <Ionicons
          name={mostrar ? "eye-off-outline" : "eye-outline"}
          size={22}
          color="#64748B"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#0F172A",
    paddingHorizontal: 14,
  },
  error: {
    borderColor: "#DC2626",
  },
  senhaContainer: {
    position: "relative",
    justifyContent: "center",
  },
  senhaInput: {
    paddingRight: 50,
  },
  olho: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 50,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
});
