export async function testSnapchatAPI() {
  console.log("Testing Snapchat API connection...");
  
  // Try all possible combinations of IDs to determine which is correct
  const ids = [
    '4b01678d-6f82-4580-b395-ff8bb4cfb37e',
    '9532ffdd-c125-47af-9137-aefbad544834'
  ];
  
  // Also try the real Snap Camera Kit demo lens
  const knownWorkingIds = [
    { groupId: '04fcd38d-1017-43c9-b326-947baf5d9a05', lensId: 'a8556af2-157f-4149-a8c3-c6ad9a699e0f', label: 'Known working demo lens' }
  ];
  
  // Test all combinations
  const combinations = [
    ...knownWorkingIds,
    { groupId: ids[0], lensId: ids[1], label: 'Combination 1' },
    { groupId: ids[1], lensId: ids[0], label: 'Combination 2' },
  ];
  
  // Also try direct Lens Studio lenses from the Snap documentation
  const lensStudioCombos = [
    { groupId: '493e08b5-8d04-4123-a1fb-bf9ee131faed', lensId: '2d6bcc66-93e7-4eec-a14a-0d2e5c1a0cd5', label: 'Heart Sunglasses' },
    { groupId: '493e08b5-8d04-4123-a1fb-bf9ee131faed', lensId: '88cc5f77-1d75-462a-bf7c-b24047f3e827', label: 'Cartoon Face' }
  ];
  
  const allCombinations = [...combinations, ...lensStudioCombos];
  
  for (const combo of allCombinations) {
    try {
      console.log(`Testing ${combo.label}: Group=${combo.groupId} Lens=${combo.lensId}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(
        `https://api-kit.snapchat.com/com.snap.camerakit.v3.Lenses/groups/${combo.groupId}/lenses/${combo.lensId}`,
        { signal: controller.signal, method: 'GET', headers: { 'Accept': 'application/json' } }
      );
      
      clearTimeout(timeoutId);
      
      console.log(`${combo.label} result: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`WORKING COMBINATION FOUND: ${combo.label}`);
        return {
          working: true,
          combination: combo
        };
      }
    } catch (error) {
      console.error(`${combo.label} error:`, error);
    }
  }
  
  return { working: false };
}
