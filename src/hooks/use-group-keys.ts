
"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "poof_group_keys";

// Custom hook to manage group encryption keys in localStorage
export const useGroupKeys = () => {
  const [keys, setKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem(STORAGE_KEY);
      if (storedKeys) {
        setKeys(JSON.parse(storedKeys));
      }
    } catch (error) {
      console.error("Failed to load group keys from localStorage:", error);
    }
  }, []);

  const saveKeys = useCallback((newKeys: Record<string, string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
      setKeys(newKeys);
    } catch (error) {
      console.error("Failed to save group keys to localStorage:", error);
    }
  }, []);

  const getKey = useCallback((groupId: string): string | undefined => {
    return keys[groupId];
  }, [keys]);

  const setKey = useCallback((groupId: string, key: string) => {
    const newKeys = { ...keys, [groupId]: key };
    saveKeys(newKeys);
  }, [keys, saveKeys]);

  const removeKey = useCallback((groupId: string) => {
    const newKeys = { ...keys };
    delete newKeys[groupId];
    saveKeys(newKeys);
  }, [keys, saveKeys]);

  return { getKey, setKey, removeKey };
};
