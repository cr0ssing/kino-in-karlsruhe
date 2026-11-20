/**
 * Copyright (C) 2024 Robin Lamberti.
 * 
 * This file is part of kino-in-karlsruhe.
 * 
 * kino-in-karlsruhe is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * kino-in-karlsruhe is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with kino-in-karlsruhe. If not, see <http://www.gnu.org/licenses/>.
 */

"use client";

import { useEffect } from "react";

// Registers the offline service worker in production builds. A new version
// takes control on its own; the page then reloads onto it right away if the
// user has not touched it since it was opened or brought back, and otherwise
// the next time it is hidden. All view state lives in the URL, so a reload
// keeps the selected week, filters and opened movie.
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const { serviceWorker } = navigator;
    // The very first install also claims the page, but it already runs the
    // current build.
    const hadController = Boolean(serviceWorker.controller);
    let updateReady = false;
    let touched = false;

    const reloadIfIdle = () => {
      if (updateReady && (!touched || document.visibilityState === "hidden")) location.reload();
    };
    const onControllerChange = () => {
      if (!hadController) return;
      updateReady = true;
      reloadIfIdle();
    };
    const onInput = () => { touched = true; };
    let registration: ServiceWorkerRegistration | undefined;
    const onVisibilityChange = () => {
      reloadIfIdle();
      if (document.visibilityState !== "visible") return;
      touched = false;
      // Installed apps can stay open for days; check again whenever they return.
      void registration?.update().catch(() => undefined);
    };

    serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    for (const type of ["pointerdown", "keydown", "wheel"]) addEventListener(type, onInput, { passive: true });
    serviceWorker.register("/sw.js").then((result) => { registration = result; }).catch(() => undefined);

    return () => {
      serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const type of ["pointerdown", "keydown", "wheel"]) removeEventListener(type, onInput);
    };
  }, []);
  return null;
}
