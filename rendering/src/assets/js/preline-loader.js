// This script dynamically imports and initializes the Preline UI library.
// It's designed to run on the client-side.

async function initPreline() {
  try {
    await import('preline');
    
    // After the import, we need to wait for the next "tick" of the event loop
    // to ensure that the HSStaticMethods object is available on the window.
    setTimeout(() => {
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    }, 100);

  } catch (error) {
    console.error("Failed to load or initialize Preline:", error);
  }
}

// Run the initialization function
initPreline(); 