'use client';
import { useEffect, useState, useRef } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extracted fetch logic
  const fetchMessage = (position: GeolocationPosition) => {
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

    // Function to get geolocation and fetch message
    const getGeoAndFetch = () => {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchMessage(position);
        },
        () => {
          setError("Unable to retrieve your location.");
          setLoading(false);
        }
      );
    };

    // Initial fetch
    getGeoAndFetch();

    // Set interval to fetch every 60 seconds
    intervalRef.current = setInterval(() => {
      getGeoAndFetch();
    }, 60000); // 60 seconds

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.billboardContainer}>
        <div className={styles.billboard}>
          {loading && <p className={styles.messageBox}>Loading BGE Message...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {!loading && !error && (
            <div className={styles.messageBox}>{message}</div>
          )}
        </div>
        <footer className={styles["brand-footer"]}>
          <div className={styles["brand-left"]}>
            <img src="/image/qr-code.png" alt="QR code" className={styles.qr} />
            <div className={styles["brand-info"]}>
              <span>Schedule a Home Energy Check-up with BGE.</span>
              <a href="https://bgesmartenergy.com" target="_blank" rel="noopener noreferrer" className={styles["brand-link"]}>
                bgesmartenergy.com
              </a>
            </div>
          </div>
          <div>
            <img src="/image/main-logo-bge.svg" alt="BGE logo" className={styles["brand-bge"]} />
            <img src="/image/empower-maryland.svg" alt="Empower Maryland logo" className={styles["brand-empower"]} />
          </div>
        </footer>
      </div>
    </div>
  );
}
