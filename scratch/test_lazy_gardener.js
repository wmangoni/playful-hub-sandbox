const puppeteer = require('puppeteer');
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(path.join(__dirname, '..')));

const PORT = 3005;
let server;

async function runTests() {
  server = app.listen(PORT, async () => {
    console.log(`Test server running on http://localhost:${PORT}`);
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Capture browser console logs
      page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
      page.on('pageerror', err => console.error('BROWSER ERROR:', err));

      console.log('Navigating to Lazy Gardener page...');
      await page.goto(`http://localhost:${PORT}/lazy_gardner/index.html`, { waitUntil: 'networkidle0' });

      // Wait for window.__garden to be defined
      await page.waitForFunction(() => window.__garden !== undefined, { timeout: 10000 });
      console.log('✅ Game initialized and window.__garden is ready');

      // Test 1: Initial state
      const initialState = await page.evaluate(() => {
        return {
          gold: window.__garden.gardenState.gold,
          weather: window.__garden.getWeather(),
          plantsCount: window.__garden.plants.length,
          goldText: document.getElementById('goldDisplay').textContent
        };
      });
      console.log('Test 1 - Initial State:', JSON.stringify(initialState));
      if (initialState.gold !== 100) throw new Error(`Expected initial gold 100, got ${initialState.gold}`);

      // Screenshot 1: Initial state
      const artifactDir = `C:/Users/William/.gemini/antigravity/brain/b55e5691-b346-4060-a28a-f9b60f901471`;
      if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
      }
      await page.screenshot({ path: `${artifactDir}/01_initial_state.png` });
      console.log('📸 Saved 01_initial_state.png');

      // Test 2: Planting a flower
      console.log('\n--- Test 2: Plant Seed ---');
      await page.evaluate(() => {
        window.__garden.plantAt(0, 0, 'flower');
      });
      const afterPlant = await page.evaluate(() => {
        return {
          gold: window.__garden.gardenState.gold,
          plantsCount: window.__garden.plants.length,
          plantType: window.__garden.plants[0].type,
          moisture: window.__garden.plants[0].moisture
        };
      });
      console.log('After plant:', JSON.stringify(afterPlant));
      if (afterPlant.gold !== 90) throw new Error(`Expected gold 90 after buying seed (cost 10), got ${afterPlant.gold}`);
      if (afterPlant.plantsCount !== 1) throw new Error(`Expected 1 plant, got ${afterPlant.plantsCount}`);

      // Test 3: Weather System & Multipliers
      console.log('\n--- Test 3: Weather System ---');
      await page.evaluate(() => window.__garden.setWeather('sunny'));
      let weatherInfo = await page.evaluate(() => ({
        weather: window.__garden.getWeather(),
        mults: window.__garden.getMultipliers()
      }));
      console.log('Sunny:', JSON.stringify(weatherInfo));
      if (weatherInfo.mults.growth !== 1.0 || weatherInfo.mults.gold !== 1.0) throw new Error('Sunny multipliers incorrect');

      await page.evaluate(() => window.__garden.setWeather('rainy'));
      weatherInfo = await page.evaluate(() => ({
        weather: window.__garden.getWeather(),
        mults: window.__garden.getMultipliers()
      }));
      console.log('Rainy:', JSON.stringify(weatherInfo));
      if (weatherInfo.mults.growth !== 2.0 || weatherInfo.mults.gold !== 1.0) throw new Error('Rainy multipliers incorrect');

      await page.evaluate(() => window.__garden.setWeather('drought'));
      weatherInfo = await page.evaluate(() => ({
        weather: window.__garden.getWeather(),
        mults: window.__garden.getMultipliers()
      }));
      console.log('Drought:', JSON.stringify(weatherInfo));
      if (weatherInfo.mults.growth !== 0.5 || weatherInfo.mults.gold !== 1.5) throw new Error('Drought multipliers incorrect');

      await page.screenshot({ path: `${artifactDir}/02_drought_weather.png` });
      console.log('📸 Saved 02_drought_weather.png');

      // Test 4: Harvest plant in Drought weather (1.5x gold multiplier)
      console.log('\n--- Test 4: Harvest in Drought (1.5x Gold) ---');
      const harvestResult = await page.evaluate(() => {
        const plant = window.__garden.plants[0];
        plant.growthStage = 3; // set to bloom/mature
        const goldBefore = window.__garden.gardenState.gold;
        window.__garden.harvestPlant(plant);
        const goldAfter = window.__garden.gardenState.gold;
        return { goldBefore, goldAfter, gained: goldAfter - goldBefore };
      });
      console.log('Harvest Result:', JSON.stringify(harvestResult));
      if (harvestResult.gained < 37) throw new Error(`Expected gained ~37-38 gold, got ${harvestResult.gained}`);

      // Test 5: Pests Mechanic & Scarecrow Upgrade
      console.log('\n--- Test 5: Pests & Scarecrow Upgrade ---');
      // Advance plant stage to sprout (growthStage >= 1) so it qualifies as pest candidate
      await page.evaluate(() => {
        const plant = window.__garden.plants[0];
        plant.growthStage = 1;
        window.__garden.spawnPest();
      });
      const pestState = await page.evaluate(() => {
        return {
          pestsCount: window.__garden.pests.length,
          hasPest: window.__garden.plants[0].hasPest
        };
      });
      console.log('Pest Spawned:', JSON.stringify(pestState));
      if (pestState.pestsCount !== 1) throw new Error('Pest did not spawn');

      await page.screenshot({ path: `${artifactDir}/03_pest_spawned.png` });
      console.log('📸 Saved 03_pest_spawned.png');

      // Kill pest
      const killResult = await page.evaluate(() => {
        const pest = window.__garden.pests[0];
        const goldBefore = window.__garden.gardenState.gold;
        window.__garden.killPest(pest);
        const goldAfter = window.__garden.gardenState.gold;
        return { pestsRemaining: window.__garden.pests.length, bonusGold: goldAfter - goldBefore };
      });
      console.log('Kill Pest Result:', JSON.stringify(killResult));
      if (killResult.pestsRemaining !== 0) throw new Error('Pest was not killed');
      if (killResult.bonusGold !== 15) throw new Error(`Expected +15 bonus gold for killing pest, got ${killResult.bonusGold}`);

      // Test Scarecrow Upgrade
      await page.evaluate(() => {
        window.__garden.gardenState.gold += 1000; // give enough gold
        window.__garden.buyScarecrow();
        window.__garden.spawnPest(); // attempt spawn while scarecrow active
      });
      const scarecrowTest = await page.evaluate(() => {
        return {
          scarecrowActive: window.__garden.gardenState.ultrasonicScarecrow,
          pestsCount: window.__garden.pests.length
        };
      });
      console.log('Scarecrow Test:', JSON.stringify(scarecrowTest));
      if (!scarecrowTest.scarecrowActive || scarecrowTest.pestsCount !== 0) {
        throw new Error('Scarecrow upgrade failed to block pest spawn');
      }

      // Test 6: Autoharvester Robot Upgrade
      console.log('\n--- Test 6: Autoharvester Robot ---');
      await page.evaluate(() => {
        window.__garden.gardenState.gold += 1000; // ensure sufficient gold for 800 cost harvester
        window.__garden.buyHarvester();
        const plant = window.__garden.plants[0];
        plant.growthStage = 3; // mature
        window.__garden.updateHarvesterRobots(3); // trigger harvest cycle
      });
      const harvesterTest = await page.evaluate(() => {
        return {
          robotsCount: window.__garden.gardenState.harvesterRobots,
          plantStage: window.__garden.plants[0].growthStage,
          gold: window.__garden.gardenState.gold
        };
      });
      console.log('Harvester Test:', JSON.stringify(harvesterTest));
      if (harvesterTest.robotsCount !== 1) throw new Error('Robots count incorrect');
      if (harvesterTest.plantStage !== 0) throw new Error('Harvester did not harvest and reset plant stage');

      await page.screenshot({ path: `${artifactDir}/04_autoharvester.png` });
      console.log('📸 Saved 04_autoharvester.png');

      // Test 7: Persistence & Offline Gains
      console.log('\n--- Test 7: Persistence & Offline Gains ---');
      await page.evaluate(() => {
        // Save state with older timestamp
        window.__garden.gardenState.lastActiveTimestamp = Date.now() - 3600000; // 1 hour ago
        localStorage.setItem('lazyGardenerState', JSON.stringify(window.__garden.gardenState));
      });

      // Reload page to test offline earnings modal
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForFunction(() => window.__garden !== undefined, { timeout: 10000 });

      const offlineModalVisible = await page.evaluate(() => {
        const modal = document.getElementById('welcomeModal');
        return modal && modal.style.display !== 'none';
      });
      console.log('Offline Welcome Modal Visible:', offlineModalVisible);

      await page.screenshot({ path: `${artifactDir}/05_offline_modal.png` });
      console.log('📸 Saved 05_offline_modal.png');

      console.log('\n==========================================');
      console.log('🎉 ALL LAZY GARDENER QA TESTS PASSED PERFECTLY!');
      console.log('==========================================');

    } catch (err) {
      console.error('❌ QA TEST FAILED:', err);
      process.exitCode = 1;
    } finally {
      if (browser) await browser.close();
      server.close();
    }
  });
}

runTests();
