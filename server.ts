import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/market-prices", async (req, res) => {
    const { crop, state } = req.query;
    const cedaApiKey = process.env.CEDA_API_KEY;

    let results: any = { ceda: null, source: null };

    // Try CEDA Ashoka API
    if (cedaApiKey) {
      try {
        // Based on CEDA documentation patterns for agricultural prices
        const cedaUrl = `https://api.ceda.ashoka.edu.in/api/v1/agriculture/prices?api_key=${cedaApiKey}&commodity=${encodeURIComponent(crop as string)}&state=${encodeURIComponent(state as string)}`;
        const response = await fetch(cedaUrl, {
          headers: { 'User-Agent': 'AgriSmart-AI/1.0' }
        });
        
        if (response.ok) {
          results.ceda = await response.json();
          results.source = 'CEDA Ashoka';
        } else if (response.status === 403) {
          console.error("CEDA API error: Key not authorized. Please check your CEDA_API_KEY in Secrets.");
          results.cedaError = "Unauthorized: Please check your CEDA_API_KEY in Secrets.";
        } else {
          const errorText = await response.text();
          console.error(`CEDA API error (${response.status}):`, errorText);
          results.cedaError = `CEDA API Error: ${response.status}`;
        }
      } catch (error) {
        console.error("Error fetching from CEDA API:", error);
        results.cedaError = "Network error connecting to CEDA API.";
      }
    }

    // Return whatever we found
    if (!results.ceda) {
      return res.status(200).json({ 
        message: "No real-time data available from CEDA API, falling back to AI search",
        cedaError: results.cedaError || "CEDA API Key missing",
        data: null 
      });
    }

    // Normalize records for the frontend
    let normalizedRecords = [];
    if (results.ceda && results.ceda.data) {
      // Assuming CEDA returns an array in 'data' field
      normalizedRecords = results.ceda.data.map((item: any) => ({
        market: item.market || item.mandi || 'Unknown',
        district: item.district || 'Unknown',
        variety: item.variety || 'Unknown',
        modal_price: item.modal_price || item.price || 0,
        state: item.state || 'Unknown'
      }));
    }

    res.json({
      ...results,
      records: normalizedRecords
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
