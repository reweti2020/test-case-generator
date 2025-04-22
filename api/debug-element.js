// api/debug-element.js
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { url, selector } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    // Default selector checks title and main buttons
    const querySelector = selector || 'title, button, .btn, [role="button"], a.button';
    
    // Fetch the URL
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    // Parse HTML
    const $ = cheerio.load(response.data, {
      decodeEntities: true,
      normalizeWhitespace: false
    });
    
    // Extract elements
    const results = [];
    
    $(querySelector).each((i, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();
      
      // Get text content
      let content = $el.text().trim();
      if (!content && $el.attr('value')) {
        content = $el.attr('value');
      }
      
      // Get attributes
      const attributes = {};
      for (const attr of el.attributes) {
        attributes[attr.name] = attr.value;
      }
      
      results.push({
        tagName,
        content,
        attributes,
        index: i
      });
    });
    
    // Return the results
    return res.status(200).json({
      success: true,
      url,
      selector: querySelector,
      results
    });
  } catch (error) {
    console.error('Debug element error:', error);
    return res.status(500).json({
      success: false,
      error: `Error: ${error.message || 'Unknown error'}`
    });
  }
};
