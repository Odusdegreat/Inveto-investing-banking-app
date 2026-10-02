import { NativeModules, Platform } from "react-native";
import type { PasskeyCreateRequest, PasskeyGetRequest } from "react-native-passkey";
import { api, type StepUpAction } from "@/src/api/client";

export function passkeySupported(): boolean {
  if (Platform.OS === "web") return typeof window !== "undefined" && window.isSecureContext && typeof PublicKeyCredential !== "undefined";
  return Boolean(NativeModules.Passkey);
}
function decode(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
  return bytes.buffer;
}
function encode(value: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(value), (byte) => String.fromCharCode(byte)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function serialize(credential: PublicKeyCredential) {
  const response = credential.response;
  const common = { id: credential.id, rawId: encode(credential.rawId), type: credential.type, authenticatorAttachment: credential.authenticatorAttachment ?? undefined, clientExtensionResults: credential.getClientExtensionResults() };
  if ("attestationObject" in response) {
    const registration = response as AuthenticatorAttestationResponse;
    return { ...common, response: { clientDataJSON: encode(response.clientDataJSON), attestationObject: encode(registration.attestationObject), transports: registration.getTransports?.() ?? [] } };
  }
  const assertion = response as AuthenticatorAssertionResponse;
  return { ...common, response: { clientDataJSON: encode(response.clientDataJSON), authenticatorData: encode(assertion.authenticatorData), signature: encode(assertion.signature), userHandle: assertion.userHandle ? encode(assertion.userHandle) : undefined } };
}
function assertAvailable() {
  if (!passkeySupported()) throw new Error("Passkeys are not available on this device. Use your transaction PIN.");
}
function passkeyError(error: unknown): Error {
  const code = typeof error === "object" && error ? ("error" in error ? String(error.error) : "name" in error ? String(error.name) : "") : "";
  if (["UserCancelled", "NotAllowedError"].includes(code)) return new Error("Passkey confirmation was cancelled or timed out. You can try again or use your PIN.");
  if (["BadConfiguration", "SecurityError"].includes(code)) return new Error("Passkeys are not available for this app address yet. Use your transaction PIN.");
  return error instanceof Error ? error : new Error("Could not complete passkey confirmation. Try again or use your PIN.");
}
export async function registerPasskey(stepUpToken: string) {
  assertAvailable();
  const { challengeToken, options } = await api.auth.biometricRegistrationOptions<PasskeyCreateRequest>(stepUpToken);
  if (!challengeToken || !options?.challenge || !options.user?.id || !options.rp?.id) throw new Error("The server could not start passkey setup.");
  try {
    let response: object;
    if (Platform.OS === "web") {
      const publicKey = {
        ...options,
        challenge: decode(options.challenge),
        user: { ...options.user, id: decode(options.user.id) },
        excludeCredentials: options.excludeCredentials?.map((item) => ({ ...item, id: decode(item.id) })),
        authenticatorSelection: { ...options.authenticatorSelection, userVerification: "required" },
      } as PublicKeyCredentialCreationOptions;
      const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey setup was cancelled.");
      response = serialize(credential);
    } else {
      const { Passkey } = await import("react-native-passkey");
      const result = await Passkey.create({ ...options, authenticatorSelection: { ...options.authenticatorSelection, userVerification: "required" } });
      response = { ...result, type: "public-key", clientExtensionResults: result.clientExtensionResults ?? {} };
    }
    await api.auth.registerBiometric(challengeToken, response);
  } catch (error) { throw passkeyError(error); }
}
export async function confirmWithPasskey(action: StepUpAction) {
  assertAvailable();
  const { challengeToken, options } = await api.auth.biometricChallenge<PasskeyGetRequest>(action);
  if (!challengeToken || !options?.challenge) throw new Error("The server could not start passkey confirmation.");
  try {
    let response: object;
    if (Platform.OS === "web") {
      const publicKey = {
        ...options,
        challenge: decode(options.challenge),
        allowCredentials: options.allowCredentials?.map((item) => ({ ...item, id: decode(item.id) })),
        userVerification: "required",
      } as PublicKeyCredentialRequestOptions;
      const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey confirmation was cancelled.");
      response = serialize(credential);
    } else {
      const { Passkey } = await import("react-native-passkey");
      const result = await Passkey.get({ ...options, userVerification: "required" });
      response = { ...result, rawId: result.rawId ?? result.id, type: "public-key", clientExtensionResults: result.clientExtensionResults ?? {} };
    }
    return await api.auth.verifyBiometric(challengeToken, response);
  } catch (error) { throw passkeyError(error); }
}
