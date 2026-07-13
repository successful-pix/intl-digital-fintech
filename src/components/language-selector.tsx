import { Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from "@/lib/languages";
import { useSession } from "@/lib/use-session";

declare global {
  interface Window {
    google?: { translate?: { TranslateElement?: new (config: Record<string, unknown>, element: string) => void } };
    googleTranslateElementInit?: () => void;
  }
}

const STORAGE_KEY = "international-digital-language";

function setTranslateCookie(language: string) {
  const value = language === DEFAULT_LANGUAGE ? "" : `/en/${language}`;
  const expires = language === DEFAULT_LANGUAGE ? "Thu, 01 Jan 1970 00:00:00 GMT" : "Fri, 31 Dec 9999 23:59:59 GMT";
  document.cookie = `googtrans=${value}; expires=${expires}; path=/`;
  document.cookie = `googtrans=${value}; expires=${expires}; domain=${window.location.hostname}; path=/`;
}

function readSavedLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
}

export function LanguageSelector() {
  const { user } = useSession();
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguage(readSavedLanguage());
    if (document.getElementById("google-translate-script")) return;
    window.googleTranslateElementInit = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      if (TranslateElement) new TranslateElement({ pageLanguage: "en", autoDisplay: false }, "google_translate_element");
    };
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  async function changeLanguage(next: string) {
    setLanguage(next);
    localStorage.setItem(STORAGE_KEY, next);
    setTranslateCookie(next);
    if (user) {
      await supabase.from("profiles").update({ preferred_language: next } as never).eq("id", user.id);
    }
    toast.success(next === DEFAULT_LANGUAGE ? "Language reset to English" : "Language updated");
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <div id="google_translate_element" className="hidden" />
      <Languages className="hidden h-4 w-4 text-muted-foreground sm:block" />
      <Select value={language} onValueChange={changeLanguage}>
        <SelectTrigger className="h-9 w-[132px] sm:w-[168px]" aria-label="Select language">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {LANGUAGE_OPTIONS.map((item) => (
            <SelectItem key={item.code} value={item.code}>{item.native}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
