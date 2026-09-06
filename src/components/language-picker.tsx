"use client";

import { X } from "lucide-react";
import { useLanguage } from "@/components/link";
import { LANGUAGES, MAX_LANGUAGES_PER_PROFILE } from "@/lib/languages";
import { Button, Select } from "@/components/ui";

export type Fluency = "LEARNING" | "CONVERSATIONAL" | "FLUENT";

export interface PickedLanguage {
  code: string;
  fluency: Fluency;
}

/**
 * Picking the languages you would meet somebody in.
 *
 * ## Why it is a list you add to, rather than a wall of checkboxes
 *
 * Forty languages as checkboxes is forty decisions, and the honest answer for
 * almost everybody is two. Adding one at a time keeps the common case at two
 * interactions and puts the long tail behind a dropdown that is sorted so the
 * languages of this city are already at the top.
 *
 * ## Why the fluency sits on the row
 *
 * The alternative is a second screen, or a "level" column that people skip.
 * Both lose the distinction the matcher needs most: "Dutch" and "Dutch, badly,
 * please be patient" find different evenings, and the second one is a perfectly
 * good answer that a form with no place for it turns into a lie.
 *
 * ## What it does not do
 *
 * No autodetection from the browser, and no defaulting to the language the
 * interface is being read in. Somebody reading Bunchy in English in Brussels
 * may well not want to socialise in it, and a prefilled answer is one nobody
 * corrects.
 */
export function LanguagePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: PickedLanguage[];
  onChange: (next: PickedLanguage[]) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();

  const chosen = new Set(value.map((language) => language.code));
  const available = LANGUAGES.filter((language) => !chosen.has(language.code));
  const full = value.length >= MAX_LANGUAGES_PER_PROFILE;

  const FLUENCY_LABELS: Record<Fluency, string> = {
    FLUENT: t("languages.fluent"),
    CONVERSATIONAL: t("languages.conversational"),
    LEARNING: t("languages.learning"),
  };

  function add(code: string) {
    if (!code || full) return;
    onChange([...value, { code, fluency: "CONVERSATIONAL" }]);
  }

  function setFluency(code: string, fluency: Fluency) {
    onChange(
      value.map((language) =>
        language.code === code ? { ...language, fluency } : language,
      ),
    );
  }

  function remove(code: string) {
    onChange(value.filter((language) => language.code !== code));
  }

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((language) => {
            const name =
              LANGUAGES.find((l) => l.code === language.code)?.name ??
              language.code;
            return (
              <li key={language.code} className="flex items-center gap-2">
                {/*
                  The name carries the width rather than a fixed column, so a
                  row reading "Nederlands" and one reading "中文" both put their
                  controls in the same place.
                */}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {name}
                </span>
                <Select
                  aria-label={t("languages.fluencyFor", { language: name })}
                  value={language.fluency}
                  disabled={disabled}
                  onChange={(event) =>
                    setFluency(language.code, event.target.value as Fluency)
                  }
                  className="w-auto"
                >
                  {(["FLUENT", "CONVERSATIONAL", "LEARNING"] as const).map(
                    (level) => (
                      <option key={level} value={level}>
                        {FLUENCY_LABELS[level]}
                      </option>
                    ),
                  )}
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => remove(language.code)}
                  aria-label={t("languages.removeLanguage", { language: name })}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {full ? (
        <p className="text-sm text-muted">{t("languages.enough")}</p>
      ) : (
        <Select
          aria-label={t("languages.add")}
          value=""
          disabled={disabled}
          onChange={(event) => add(event.target.value)}
        >
          <option value="">{t("languages.add")}</option>
          {available.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
