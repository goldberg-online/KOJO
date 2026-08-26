import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function isActionError(res: unknown): res is { error: string } {
  return (
    typeof res === "object" &&
    res !== null &&
    "error" in res &&
    typeof (res as { error: unknown }).error === "string" &&
    Boolean((res as { error: string }).error)
  );
}
