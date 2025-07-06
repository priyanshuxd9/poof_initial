
"use client";

import { useEffect } from "react";

export function FontSizeManager() {
  useEffect(() => {
    const savedFontSize = localStorage.getItem("app-font-size");
    if (savedFontSize) {
      document.documentElement.style.fontSize = `${savedFontSize}%`;
    } else {
      const defaultSize = '90';
      document.documentElement.style.fontSize = `${defaultSize}%`;
      localStorage.setItem("app-font-size", defaultSize);
    }
  }, []);

  return null; // This component does not render anything
}
