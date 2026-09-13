"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";

/** "I talked to someone." One tap, a timestamp, nothing about who. Undo is right there. */
export default function PeopleLog({ lang }: { lang: string }) {
  const [done, setDone] = useState(false);
  async function log(undo = false) {
    setDone(!undo);
    await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ undo }) }).catch(() => {});
  }
  return done
    ? <p className="people-log done">{t("pplLogged", lang)} <button type="button" className="linkish" onClick={() => log(true)}>{t("undo", lang)}</button></p>
    : <button type="button" className="btn people-log" onClick={() => log()}>{t("pplLog", lang)}</button>;
}
