import * as Localization from "expo-localization";
import { I18n } from "i18n-js";
import en from "./locales/en.json";
import kk from "./locales/kk.json";
import ru from "./locales/ru.json";

const translations = {
  en,
  ru,
  kk,
};

const i18n = new I18n(translations);

i18n.locale = Localization.getLocales()[0]?.languageCode ?? "en";
i18n.enableFallback = true;
i18n.defaultLocale = "en";

export default i18n;
