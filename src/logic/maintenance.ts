import { useEffect } from "react";

export function useMaintenance() {
  useEffect(() => {
    const tick = () => console.log("Maintenance tick");
    tick();
    const id = setInterval(tick, 60_000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}