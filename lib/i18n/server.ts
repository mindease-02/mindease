import { cookies } from "next/headers";
import { pickUi, type UI } from "./index";

export const LANG_COOKIE = "me.lang";

/** The UI language for a server-rendered page: the person's setting when signed in, else the cookie, else English. */
export async function pageLanguage(stateLanguage?: string | null): Promise<UI> {
  const jar = await cookies();
  return pickUi(stateLanguage ?? undefined, jar.get(LANG_COOKIE)?.value);
}
