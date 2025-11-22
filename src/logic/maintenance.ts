export function startMaintenance(): () => void {
  const tick = () => console.log("Maintenance tick");
  tick();
  const id = setInterval(tick, 60_000);
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      tick();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}