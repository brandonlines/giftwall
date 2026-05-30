// String catalog. `en` is the source of truth; `es` is typed to have EXACTLY
// the same keys (TS errors if one drifts), and a unit test re-checks parity.
const en = {
  "common.profile": "Profile",
  "common.cancel": "Cancel",

  "signin.subtitle": "Shared wishlists, surprises kept secret.",
  "signin.emailPlaceholder": "you@example.com",
  "signin.sendCode": "Email me a code",
  "signin.codeHint": "Enter the 6-digit code sent to {email}.",
  "signin.codePlaceholder": "123456",
  "signin.verify": "Verify & sign in",
  "signin.differentEmail": "Use a different email",
  "signin.or": "or",
  "signin.google": "Continue with Google",

  "groups.empty":
    "No groups yet. Create one below, or join with a code from a family member.",
  "groups.createSection": "Create a group",
  "groups.namePlaceholder": "e.g. The Lines Family",
  "groups.create": "Create",
  "groups.joinSection": "Join a group",
  "groups.joinPlaceholder": "Paste group code",
  "groups.join": "Join",
} as const;

export type StringKey = keyof typeof en;

const es: Record<StringKey, string> = {
  "common.profile": "Perfil",
  "common.cancel": "Cancelar",

  "signin.subtitle": "Listas compartidas, sorpresas a salvo.",
  "signin.emailPlaceholder": "tu@ejemplo.com",
  "signin.sendCode": "Envíame un código",
  "signin.codeHint": "Introduce el código de 6 dígitos enviado a {email}.",
  "signin.codePlaceholder": "123456",
  "signin.verify": "Verificar e iniciar sesión",
  "signin.differentEmail": "Usar otro correo",
  "signin.or": "o",
  "signin.google": "Continuar con Google",

  "groups.empty":
    "Aún no hay grupos. Crea uno abajo o únete con un código de un familiar.",
  "groups.createSection": "Crear un grupo",
  "groups.namePlaceholder": "p. ej. La Familia Pérez",
  "groups.create": "Crear",
  "groups.joinSection": "Unirse a un grupo",
  "groups.joinPlaceholder": "Pega el código del grupo",
  "groups.join": "Unirse",
};

export const strings = { en, es };
