
"use client";

import { useEffect } from "react";

export function FontSizeManager() {
  useEffect(() => {
    const savedFontSize = localStorage.getItem("app-font-size");
    if (savedFontSize) {
      document.documentElement.style.fontSize = `${savedFontSize}%`;
    }
  }, []);

  return null; // This component does not render anything
}
