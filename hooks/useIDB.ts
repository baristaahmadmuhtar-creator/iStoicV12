
import { useState, useEffect, useCallback, useRef } from 'react';
import { get, set } from 'idb-keyval';

export function useIDB<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [value, setInternalValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    async function loadData() {
      try {
        let dbValue = await get<T>(key);
        
        // Migration Logic: If DB is empty, check localStorage
        if (dbValue === undefined) {
            const local = localStorage.getItem(key);
            if (local) {
                try {
                    dbValue = JSON.parse(local);
                    await set(key, dbValue); // Persist migration
                    console.log(`[MIGRATION] Moved ${key} from LS to IDB`);
                    // Optional: localStorage.removeItem(key); 
                } catch (e) {
                    console.error("Migration parse error", e);
                }
            }
        }

        if (mounted.current && dbValue !== undefined) {
          setInternalValue(dbValue);
        }
      } catch (err) {
        console.error(`Error loading ${key} from IDB:`, err);
      } finally {
        if (mounted.current) setIsLoaded(true);
      }
    }
    loadData();
    return () => { mounted.current = false; };
  }, [key]);

  const setValue = useCallback((val: T | ((prev: T) => T)) => {
    setInternalValue((prev) => {
      const newValue = val instanceof Function ? val(prev) : val;
      // Fire and forget save
      set(key, newValue).catch(err => console.error(`Error saving ${key} to IDB:`, err));
      return newValue;
    });
  }, [key]);

  return [value, setValue, isLoaded];
}
