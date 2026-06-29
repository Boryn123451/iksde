export async function requestBrowserLocation() {
  if (!navigator.geolocation) {
    throw new Error('Geolokalizacja niedostępna w tej przeglądarce');
  }

  if (navigator.permissions) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') throw new Error('Brak zgody na geolokalizację w ustawieniach przeglądarki');
    } catch (error) {
      if (error.message.includes('Brak zgody')) throw error;
    }
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        city: 'Moja lokalizacja',
        country: '',
      }),
      (error) => {
        const messages = {
          1: 'Odmówiono dostępu do lokalizacji',
          2: 'Nie udało się ustalić lokalizacji',
          3: 'Przekroczono czas pobierania lokalizacji',
        };
        reject(new Error(messages[error.code] || 'Błąd geolokalizacji'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
