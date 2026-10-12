import { en } from "./en";

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export type Translations = DeepString<typeof en>;
export type Language = "ar" | "en";
export type Direction = "rtl" | "ltr";
