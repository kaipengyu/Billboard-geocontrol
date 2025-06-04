'use client';
import { useEffect, useState, useRef } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const watcherRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extracted fetch logic
  const fetchMessage = (position: GeolocationPosition) => {
    console.log('fetchMessage called with position:', position);
    setLoading(true);
    setError("");
    fetch("/api/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setMessage(data.message);
          console.log('Message updated:', data.message);
        } else {
          setError(data.error || "Failed to generate message.");
        }
      })
      .catch(() => {
        setError("Failed to connect to server.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }
    // Initial fetch and watcher
    watcherRef.current = navigator.geolocation.watchPosition(
      (position) => {
        fetchMessage(position);
      },
      () => {
        setError("Unable to retrieve your location.");
        setLoading(false);
      }
    );

    // Soft refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      console.log('Interval fired, fetching current position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchMessage(position);
        },
        () => {
          setError("Unable to retrieve your location.");
          setLoading(false);
        }
      );
    }, 30000); // 30 seconds

    return () => {
      if (watcherRef.current !== null) {
        navigator.geolocation.clearWatch(watcherRef.current);
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 style={{ fontSize: "3rem", textAlign: "center", margin: "2rem 0" }}>
          Smart Billboard
        </h1>
        {loading && <p style={{ fontSize: "2rem" }}>Loading...</p>}
        {error && <p style={{ color: "red", fontSize: "2rem" }}>{error}</p>}
        {!loading && !error && (
          <div style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            background: "rgba(255,255,255,0.8)",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
            textAlign: "center",
            maxWidth: "900px",
            margin: "0 auto"
          }}>
            {message}
          </div>
        )}
      </main>
    </div>
  );
}
