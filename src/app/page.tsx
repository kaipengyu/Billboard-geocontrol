'use client';
import { useEffect, useState, useRef } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [theme, setTheme] = useState<'default' | 'purple'>("purple");
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
    <>
    <div className={styles.page}>
      <div className={
        theme === 'purple'
          ? `${styles.billboardContainer} ${styles['purple-theme']}`
          : styles.billboardContainer
      }>
        <div className={styles.billboard}>
          {loading && <p className={styles.messageBox}>Loading BGE Message...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {!loading && !error && (
            <div className={styles.messageBox}>{message}</div>
          )}
        </div>

        <footer className={styles["brand-footer"]}>
          <div className={styles["brand-left"]}>
            <img src={theme === 'purple' ? '/image/qr-code-white.png' : '/image/qr-code.png'} alt="QR code" className={styles.qr} />
            <div className={styles["brand-info"]}>
              <span>Schedule a Home Energy Check-up with BGE.</span>
              <a href="https://bgesmartenergy.com" target="_blank" rel="noopener noreferrer" className={styles["brand-link"]}>
                bgesmartenergy.com
              </a>
            </div>
          </div>
          <div className={styles["brand-logos-vertical"]}>
            <img src={theme === 'purple' ? '/image/bge-reverse.svg' : '/image/main-logo-bge.svg'} alt="BGE logo" className={styles["brand-bge"]} />
            <img src={theme === 'purple' ? '/image/empower-maryland-reverse.svg' : '/image/empower-maryland.svg'} alt="Empower Maryland logo" className={styles["brand-empower"]} />
          </div>
        </footer>
      </div>

                  {/* Theme Toggle Button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
          <button
            onClick={() => setTheme(theme === 'default' ? 'purple' : 'default')}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '1rem',
              border: 'none',
              background: theme === 'purple' ? '#7c3aed' : '#e0e0e0',
              color: theme === 'purple' ? '#fff' : '#333',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s, color 0.2s',
              marginBottom: '2rem',
            }}
            aria-pressed={theme === 'purple'}
          >
            {theme === 'purple' ? 'Switch to Light Theme' : 'Switch to BGE Theme'}
          </button>
        </div>


    </div>


        </>
  );
}
