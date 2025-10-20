'use client';
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [manualLocation, setManualLocation] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [filteredLocations, setFilteredLocations] = useState<string[]>([]);
  const [hasManualLocation, setHasManualLocation] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Preset locations
  const presetLocations = [
    "San Francisco, CA",
    "Detroit, MI", 
    "Baltimore, MD",
    "New York City, NY"
  ];

  // Handle input change and filter locations
  const handleInputChange = (value: string) => {
    setManualLocation(value);
    if (value.trim()) {
      const filtered = presetLocations.filter(location =>
        location.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredLocations(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredLocations(presetLocations);
      setShowDropdown(true);
    }
  };

  // Handle location selection from dropdown
  const handleLocationSelect = (location: string) => {
    setManualLocation(location);
    setShowDropdown(false);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (manualLocation.trim()) {
      const filtered = presetLocations.filter(location =>
        location.toLowerCase().includes(manualLocation.toLowerCase())
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations(presetLocations);
    }
    setShowDropdown(true);
  };

  // Handle input blur (with delay to allow click on dropdown)
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  // Geocoding function to convert location string to coordinates
  const geocodeLocation = async (location: string): Promise<{ latitude: number; longitude: number; locationName: string } | null> => {
    try {
      setIsGeocoding(true);
      
      // Check if input looks like a US zip code (5 digits)
      const isUSZipCode = /^\d{5}$/.test(location.trim());
      
      if (isUSZipCode) {
        // For US zip codes, use zippopotam.us API (free, no key required, accurate)
        const response = await fetch(
          `https://api.zippopotam.us/us/${location.trim()}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data?.places && data.places.length > 0) {
            const place = data.places[0];
            return {
              latitude: parseFloat(place.latitude),
              longitude: parseFloat(place.longitude),
              locationName: `${place['place name']}, ${place['state abbreviation']}`
            };
          }
        }
      } else {
        // For city/state names, use Nominatim with US country restriction
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.trim())}&limit=1&addressdetails=1&countrycodes=us`,
          {
            headers: { 'User-Agent': 'smart-billboard-v2/1.0' }
          }
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Check if the location is in the US
          const countryCode = data[0].address?.country_code;
          if (countryCode && countryCode.toLowerCase() !== 'us') {
            setError("Please enter a US location only.");
            return null;
          }
          
          const address = data[0].address;
          const city = address.city || address.town || address.village || address.hamlet;
          const state = address.state;
          
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
            locationName: `${city}, ${state}`
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    } finally {
      setIsGeocoding(false);
    }
  };

  // Extracted fetch logic
  const fetchMessage = async (position?: GeolocationPosition, manualCoords?: { latitude: number; longitude: number; locationName?: string }) => {
    setLoading(true);
    setError("");
    
    // Check for location parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const locationParam = urlParams.get('location');
    
    let fetchUrl = "/api/generate-message";
    let requestBody = {};
    
    if (locationParam) {
      // Use location parameter
      fetchUrl += `?location=${locationParam}`;
    } else if (manualCoords) {
      // Use manual coordinates
      requestBody = {
        latitude: manualCoords.latitude,
        longitude: manualCoords.longitude,
        locationName: manualCoords.locationName
      };
    } else if (position) {
      // Use geolocation
      requestBody = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } else {
      setError("No location available");
      setLoading(false);
      return;
    }
    
    fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(requestBody),
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

  // Handle manual location input
  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocation.trim()) return;
    
    setShowDropdown(false);
    
    const coords = await geocodeLocation(manualLocation.trim());
    if (coords) {
      // Save coordinates to localStorage for persistence (only in browser)
      if (typeof window !== 'undefined') {
        localStorage.setItem('manualLocation', JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          locationName: coords.locationName
        }));
        setHasManualLocation(true);
      }
      
      // Clear existing interval
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      
      // Fetch message with new coordinates
      await fetchMessage(undefined, coords);
      
      // Set new interval with manual coordinates
      intervalRef.current = setInterval(() => {
        fetchMessage(undefined, coords);
      }, 180000); // 3 minutes
    } else {
      setError("Could not find location. Please try a different US zip code or city name with state.");
      setManualLocation("");
    }
  };

  // Clear manual location and use browser geolocation
  const clearManualLocation = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('manualLocation');
    }
    setManualLocation("");
    setShowDropdown(false);
    setHasManualLocation(false);
    
    // Clear existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
    
    // Trigger geolocation fetch
    if (navigator.geolocation) {
      const getGeoAndFetch = () => {
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
      
      // Set interval for geolocation updates
      intervalRef.current = setInterval(() => {
        getGeoAndFetch();
      }, 180000); // 3 minutes
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for location parameter in URL first
    const urlParams = new URLSearchParams(window.location.search);
    const locationParam = urlParams.get('location');
    
    if (locationParam) {
      // Use location parameter, no need for geolocation
      fetchMessage();
    } else {
      // Check for saved manual location in localStorage (only in browser)
      const savedLocation = typeof window !== 'undefined' ? localStorage.getItem('manualLocation') : null;
      
      if (savedLocation) {
        try {
          const { latitude, longitude, locationName } = JSON.parse(savedLocation);
          // Set the saved location name in the input field
          setManualLocation(locationName);
          setHasManualLocation(true);
          // Use saved coordinates
          fetchMessage(undefined, { latitude, longitude, locationName });
          
          // Set interval to fetch every 3 minutes with saved coordinates
          intervalRef.current = setInterval(() => {
            fetchMessage(undefined, { latitude, longitude, locationName });
          }, 180000); // 3 minutes
          
          return;
        } catch (error) {
          console.error('Error parsing saved location:', error);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('manualLocation');
          }
        }
      }
      
      // Use geolocation as fallback
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        setLoading(false);
        return;
      }

      // Function to get geolocation and fetch message
      const getGeoAndFetch = () => {
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

      // Set interval to fetch every 3 minutes
      intervalRef.current = setInterval(() => {
        getGeoAndFetch();
      }, 180000); // 3 minutes
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <>
    <div className={styles.page}>
      <div className={`${styles.billboardContainer} ${styles['purple-theme']} ${error ? styles['error-theme'] : ''}`}>
        <div className={styles.billboard}>
          {loading && <p className={styles.messageBox}>Loading ICF Message...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {!loading && !error && (
            <div className={styles.messageBox}>{message}</div>
          )}
        </div>

        <footer className={styles["brand-footer"]}>
          <div className={styles["brand-left"]}>
            <div className={styles["brand-info"]}>
              <span>Connecting People, Technology, and Innovation.</span>
              <a href="https://icf.com" target="_blank" rel="noopener noreferrer" className={styles["brand-link"]}>
                icf.com
              </a>
            </div>
          </div>
          <div className={styles["brand-logos-vertical"]}>
            <Image src="/image/ICF-logo-black.png" alt="ICF logo" className={styles["brand-icf"]} width={100} height={50} />
          </div>
        </footer>
      </div>

      {/* Manual Location Input */}
      <div className={styles.locationInputContainer}>
        <form onSubmit={handleManualLocationSubmit} className={styles.locationForm}>
          <div className={styles.inputGroup}>
            <div className={styles.comboboxContainer}>
              <input
                type="text"
                value={manualLocation}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Enter zip code or city name..."
                className={styles.locationInput}
                disabled={isGeocoding || loading}
              />
              {showDropdown && filteredLocations.length > 0 && (
                <div className={styles.dropdown}>
                  {filteredLocations.map((location, index) => (
                    <div
                      key={index}
                      className={styles.dropdownItem}
                      onClick={() => handleLocationSelect(location)}
                    >
                      {location}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.buttonGroup}>
              <button
                type="submit"
                disabled={isGeocoding || loading || !manualLocation.trim()}
                className={styles.locationButton}
              >
                {isGeocoding ? 'Finding...' : 'Enter US location'}
              </button>
              {hasManualLocation && (
                <button
                  type="button"
                  onClick={clearManualLocation}
                  className={styles.clearButton}
                  disabled={isGeocoding || loading}
                >
                  Use Current Location
                </button>
              )}
            </div>
          </div>
        </form>
      </div>



    </div>


        </>
  );
}
