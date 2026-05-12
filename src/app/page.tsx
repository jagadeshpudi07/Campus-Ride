"use client";

import { useEffect, useState } from "react";
import ClickSpark from "../components/ClickSpark";
import { supabase } from "../backend/supabase";

export default function Home() {
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    // Expose supabase to global window for campusride.js
    (window as any).supabase = supabase;
    // Load the body HTML
    fetch("/body.html")
      .then((res) => res.text())
      .then((html) => {
        setBodyHtml(html);
      });
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (!bodyHtml) return;

    // Load Leaflet first, then our app script
    const leafletScript = document.createElement("script");
    leafletScript.src =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    leafletScript.onload = () => {
      const appScript = document.createElement("script");
      appScript.src = "/campusride.js";
      document.body.appendChild(appScript);
    };
    document.body.appendChild(leafletScript);

    return () => {
      // Cleanup scripts on unmount
      document
        .querySelectorAll('script[src*="leaflet"], script[src*="campusride"]')
        .forEach((s) => s.remove());
    };
  }, [bodyHtml]);

  useEffect(() => {
    if (!bodyHtml) return;

    const themeToggle = document.getElementById("themeToggle") as HTMLInputElement;
    const ripple = document.querySelector(".theme-ripple") as HTMLElement;

    if (themeToggle) {
      // Sync toggle state with current theme
      themeToggle.checked = document.body.classList.contains("dark");

      const switchLabel = themeToggle.closest(".theme-switch") as HTMLElement;

      // Capture click position for ripple origin
      const handleClick = (e: MouseEvent) => {
        if (!ripple) return;

        const currentlyDark = document.body.classList.contains("dark");

        // Position ripple at click point
        ripple.style.left = `${e.clientX}px`;
        ripple.style.top = `${e.clientY}px`;

        // Reset animation
        ripple.classList.remove("active", "to-dark", "to-light");
        void ripple.offsetWidth; // Force reflow to restart animation

        // Set direction-aware color and trigger ripple
        ripple.classList.add(currentlyDark ? "to-light" : "to-dark");
        ripple.classList.add("active");
      };

      // Handle the actual theme switch with smooth transitions
      const handleThemeChange = () => {
        // Enable smooth transitions on all elements
        document.body.classList.add("theme-transitioning");

        // Slight delay so ripple leads the color change
        setTimeout(() => {
          if (themeToggle.checked) {
            document.body.classList.add("dark");
            localStorage.setItem("theme", "dark");
          } else {
            document.body.classList.remove("dark");
            localStorage.setItem("theme", "light");
          }
        }, 200);

        // Remove transition class after animation completes
        setTimeout(() => {
          document.body.classList.remove("theme-transitioning");
        }, 1000);
      };

      if (switchLabel) {
        switchLabel.addEventListener("click", handleClick);
      }
      themeToggle.addEventListener("change", handleThemeChange);

      return () => {
        if (switchLabel) {
          switchLabel.removeEventListener("click", handleClick);
        }
        themeToggle.removeEventListener("change", handleThemeChange);
      };
    }
  }, [bodyHtml]);

  return (
    <ClickSpark
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </ClickSpark>
  );
}

