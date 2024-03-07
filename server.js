const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

const BASE_URL = 'https://api.fillout.com';

// Filter endpoint
app.get('/:formId/filteredResponses', async (req, res) => {
  const accessToken = process.env.ACCESS_TOKEN;
  const { formId } = req.params;
  try {
    const response = await axios.get(
      `${BASE_URL}/v1/api/forms/${formId}/submissions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: req.query,
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
