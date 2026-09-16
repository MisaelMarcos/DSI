import { StyleSheet, TextInput, TextInputProps } from "react-native";

type InputProps = TextInputProps & {
  // Quando true, a borda fica vermelha (ex.: erro de validação).
  error?: boolean;
};

export function Input({ error, style, ...rest }: InputProps) {
  return <TextInput style={[styles.input, error && styles.error, style]} {...rest} />;
}

const styles = StyleSheet.create({
  input: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#DCDCDC",
    borderRadius: 8,
    fontSize: 16,
    paddingLeft: 12,
  },
  error: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
});
