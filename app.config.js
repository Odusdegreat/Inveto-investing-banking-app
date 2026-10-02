/** @type {import('expo/config').ConfigFunction} */
module.exports = ({ config }) => {
  const rpId = process.env.EXPO_PUBLIC_PASSKEY_RP_ID?.trim();
  if (rpId && (!/^[a-z0-9.-]+$/i.test(rpId) || rpId.includes(":"))) {
    throw new Error("EXPO_PUBLIC_PASSKEY_RP_ID must be a hostname without a scheme or path.");
  }
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ["expo-notifications", { defaultChannel: "default" }], "expo-web-browser"],
    ios: {
      ...config.ios,
      ...(rpId ? { associatedDomains: [...(config.ios?.associatedDomains ?? []), `webcredentials:${rpId}`] } : {}),
    },
  };
};
